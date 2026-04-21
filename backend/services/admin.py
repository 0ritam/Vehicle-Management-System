from django.contrib import admin

from .models import Component, Payment, ServiceItem, ServiceOrder, Vehicle


@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "component_type", "unit_price", "stock_quantity", "is_active"]
    list_filter = ["component_type", "is_active"]
    search_fields = ["name", "sku"]


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ["registration_number", "make", "model", "year", "owner_name", "owner_contact"]
    list_filter = ["make", "year"]
    search_fields = ["registration_number", "owner_name"]


class ServiceItemInline(admin.TabularInline):
    model = ServiceItem
    extra = 0
    readonly_fields = ["line_total"]


@admin.register(ServiceOrder)
class ServiceOrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "vehicle", "status", "total", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["order_number", "vehicle__registration_number", "vehicle__owner_name"]
    readonly_fields = ["order_number", "subtotal", "tax_amount", "total"]
    inlines = [ServiceItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["reference", "order", "amount", "method", "paid_at"]
    list_filter = ["method", "paid_at"]
    search_fields = ["reference", "order__order_number"]
