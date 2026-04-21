import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone


class Component(models.Model):
    class ComponentType(models.TextChoices):
        NEW_PART = "NEW_PART", "New Part"
        REPAIR_SERVICE = "REPAIR_SERVICE", "Repair Service"

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, unique=True, db_index=True)
    component_type = models.CharField(
        max_length=20, choices=ComponentType.choices
    )
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    labor_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    repair_alternative = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="new_part_for",
        help_text="Links a NEW_PART to its REPAIR_SERVICE counterpart",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["component_type"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.sku})"


class Vehicle(models.Model):
    registration_number = models.CharField(
        max_length=20, unique=True, db_index=True
    )
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    owner_name = models.CharField(max_length=200)
    owner_contact = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner_name"]),
        ]

    def __str__(self) -> str:
        return f"{self.registration_number} — {self.make} {self.model}"


class ServiceOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        QUOTED = "QUOTED", "Quoted"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="service_orders"
    )
    issue_description = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    labor_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("500")
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("18")
    )
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    tax_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.order_number} — {self.vehicle.registration_number}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            year = timezone.now().year
            last = (
                ServiceOrder.objects.filter(order_number__startswith=f"SO-{year}-")
                .order_by("-order_number")
                .values_list("order_number", flat=True)
                .first()
            )
            if last:
                seq = int(last.split("-")[-1]) + 1
            else:
                seq = 1
            self.order_number = f"SO-{year}-{seq:04d}"
        super().save(*args, **kwargs)

    def recalculate(self):
        items = self.items.select_related("component").all()
        parts_total = sum(item.line_total for item in items)
        labor_total = sum(
            item.component.labor_hours * self.labor_rate for item in items
        )
        self.subtotal = parts_total + labor_total
        after_discount = self.subtotal - self.discount_amount
        self.tax_amount = (after_discount * self.tax_rate / Decimal("100")).quantize(
            Decimal("0.01")
        )
        self.total = after_discount + self.tax_amount
        self.save(update_fields=["subtotal", "tax_amount", "total"])


class ServiceItem(models.Model):
    class ItemType(models.TextChoices):
        NEW = "NEW", "New"
        REPAIR = "REPAIR", "Repair"

    order = models.ForeignKey(
        ServiceOrder, on_delete=models.CASCADE, related_name="items"
    )
    component = models.ForeignKey(
        Component, on_delete=models.PROTECT, related_name="service_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price_snapshot = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True
    )
    line_total = models.DecimalField(
        max_digits=12, decimal_places=2, editable=False, default=Decimal("0")
    )
    item_type = models.CharField(max_length=10, choices=ItemType.choices)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.component.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        if not self.unit_price_snapshot:
            self.unit_price_snapshot = self.component.unit_price
        if not self.item_type:
            self.item_type = (
                self.ItemType.REPAIR
                if self.component.component_type == Component.ComponentType.REPAIR_SERVICE
                else self.ItemType.NEW
            )
        self.line_total = self.unit_price_snapshot * self.quantity
        super().save(*args, **kwargs)


class Payment(models.Model):
    order = models.OneToOneField(
        ServiceOrder, on_delete=models.CASCADE, related_name="payment"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, default="SIMULATED")
    reference = models.CharField(
        max_length=50,
        unique=True,
        default=None,
    )
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self) -> str:
        return f"Payment {self.reference} for {self.order.order_number}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"PAY-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)
