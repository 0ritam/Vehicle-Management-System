from decimal import Decimal

from rest_framework import serializers

from .models import Component, Payment, ServiceItem, ServiceOrder, Vehicle


# ── Component ────────────────────────────────────────────────────────────────

class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = [
            "id", "name", "sku", "component_type", "unit_price",
            "labor_hours", "stock_quantity", "repair_alternative",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ComponentListSerializer(serializers.ModelSerializer):
    """Minimal serializer for dropdowns."""
    class Meta:
        model = Component
        fields = ["id", "name", "sku", "component_type", "unit_price", "stock_quantity", "is_active"]


# ── Vehicle ──────────────────────────────────────────────────────────────────

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "id", "registration_number", "make", "model", "year",
            "owner_name", "owner_contact", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ── ServiceItem ──────────────────────────────────────────────────────────────

class ServiceItemSerializer(serializers.ModelSerializer):
    component = ComponentListSerializer(read_only=True)
    component_id = serializers.PrimaryKeyRelatedField(
        queryset=Component.objects.filter(is_active=True),
        source="component",
        write_only=True,
    )

    class Meta:
        model = ServiceItem
        fields = [
            "id", "component", "component_id", "quantity",
            "unit_price_snapshot", "line_total", "item_type",
        ]
        read_only_fields = ["id", "unit_price_snapshot", "line_total", "item_type"]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value


# ── Payment ──────────────────────────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "method", "reference", "paid_at"]
        read_only_fields = ["id", "amount", "reference", "paid_at"]


# ── ServiceOrder ─────────────────────────────────────────────────────────────

class ServiceOrderReadSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)
    items = ServiceItemSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)

    class Meta:
        model = ServiceOrder
        fields = [
            "id", "order_number", "vehicle", "issue_description", "status",
            "labor_rate", "tax_rate", "discount_amount",
            "subtotal", "tax_amount", "total",
            "items", "payment",
            "created_at", "completed_at",
        ]


class ServiceOrderWriteSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        source="vehicle",
    )

    class Meta:
        model = ServiceOrder
        fields = [
            "id", "order_number", "vehicle_id", "issue_description",
            "labor_rate", "tax_rate", "discount_amount", "status",
            "subtotal", "tax_amount", "total",
            "created_at", "completed_at",
        ]
        read_only_fields = [
            "id", "order_number", "status", "subtotal", "tax_amount", "total",
            "created_at", "completed_at",
        ]


class ServiceOrderAddItemSerializer(serializers.Serializer):
    component_id = serializers.PrimaryKeyRelatedField(
        queryset=Component.objects.filter(is_active=True),
    )
    quantity = serializers.IntegerField(min_value=1, default=1)


class ServiceOrderTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ServiceOrder.Status.choices)


class ServiceOrderPaySerializer(serializers.Serializer):
    method = serializers.CharField(max_length=20, default="SIMULATED")


# ── Revenue ──────────────────────────────────────────────────────────────────

class RevenueBucketSerializer(serializers.Serializer):
    bucket = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    orders = serializers.IntegerField()


class RevenueSummarySerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    order_count = serializers.IntegerField()
    avg_order_value = serializers.DecimalField(max_digits=14, decimal_places=2)


# ── Compare ──────────────────────────────────────────────────────────────────

class CompareOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    sku = serializers.CharField()
    component_type = serializers.CharField()
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    labor_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    stock_quantity = serializers.IntegerField()


class CompareResponseSerializer(serializers.Serializer):
    new_part = CompareOptionSerializer()
    repair_service = CompareOptionSerializer()
    savings_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    savings_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
