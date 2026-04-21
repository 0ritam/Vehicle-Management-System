from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncYear
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from weasyprint import HTML

from .models import Component, Payment, ServiceItem, ServiceOrder, Vehicle
from .serializers import (
    CompareResponseSerializer,
    ComponentListSerializer,
    ComponentSerializer,
    PaymentSerializer,
    RevenueBucketSerializer,
    RevenueSummarySerializer,
    ServiceItemSerializer,
    ServiceOrderAddItemSerializer,
    ServiceOrderPaySerializer,
    ServiceOrderReadSerializer,
    ServiceOrderTransitionSerializer,
    ServiceOrderWriteSerializer,
    VehicleSerializer,
)


class ComponentViewSet(viewsets.ModelViewSet):
    serializer_class = ComponentSerializer
    filterset_fields = ["component_type", "is_active"]

    def get_queryset(self):
        qs = Component.objects.all()
        component_type = self.request.query_params.get("component_type")
        if component_type:
            qs = qs.filter(component_type=component_type)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("true", "1"))
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(sku__icontains=search))
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ComponentListSerializer
        return ComponentSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        qs = Vehicle.objects.all()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(registration_number__icontains=search)
                | Q(owner_name__icontains=search)
            )
        return qs


# Legal state transitions
VALID_TRANSITIONS = {
    ServiceOrder.Status.DRAFT: [ServiceOrder.Status.QUOTED, ServiceOrder.Status.CANCELLED],
    ServiceOrder.Status.QUOTED: [ServiceOrder.Status.IN_PROGRESS, ServiceOrder.Status.CANCELLED],
    ServiceOrder.Status.IN_PROGRESS: [ServiceOrder.Status.COMPLETED, ServiceOrder.Status.CANCELLED],
    ServiceOrder.Status.COMPLETED: [ServiceOrder.Status.PAID],
    ServiceOrder.Status.PAID: [],
    ServiceOrder.Status.CANCELLED: [],
}


class ServiceOrderViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = ServiceOrder.objects.select_related("vehicle").prefetch_related(
            "items__component", "payment"
        )
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search)
                | Q(vehicle__registration_number__icontains=search)
                | Q(vehicle__owner_name__icontains=search)
            )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ServiceOrderWriteSerializer
        return ServiceOrderReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            ServiceOrderReadSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        if instance.items.exists():
            order.recalculate()
        return Response(ServiceOrderReadSerializer(order).data)

    @action(detail=True, methods=["post"], url_path="add-item")
    @transaction.atomic
    def add_item(self, request, pk=None):
        order = self.get_object()
        serializer = ServiceOrderAddItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        component = serializer.validated_data["component_id"]
        quantity = serializer.validated_data["quantity"]

        item = ServiceItem.objects.create(
            order=order,
            component=component,
            quantity=quantity,
        )
        order.recalculate()

        return Response(
            ServiceItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path=r"items/(?P<item_id>\d+)")
    @transaction.atomic
    def remove_item(self, request, pk=None, item_id=None):
        order = self.get_object()
        try:
            item = order.items.get(pk=item_id)
        except ServiceItem.DoesNotExist:
            return Response(
                {"detail": "Item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        item.delete()
        order.recalculate()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="transition")
    @transaction.atomic
    def transition(self, request, pk=None):
        order = self.get_object()
        serializer = ServiceOrderTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        allowed = VALID_TRANSITIONS.get(order.status, [])

        if new_status not in allowed:
            return Response(
                {
                    "detail": f"Cannot transition from {order.status} to {new_status}. "
                    f"Allowed: {[s.value for s in allowed]}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        if new_status == ServiceOrder.Status.COMPLETED:
            order.completed_at = timezone.now()
        order.save(update_fields=["status", "completed_at"])

        return Response(ServiceOrderReadSerializer(order).data)

    @action(detail=True, methods=["post"], url_path="pay")
    @transaction.atomic
    def pay(self, request, pk=None):
        order = self.get_object()

        if order.status != ServiceOrder.Status.COMPLETED:
            return Response(
                {"detail": "Only COMPLETED orders can be paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(order, "payment") and order.payment:
            return Response(
                {"detail": "Order already has a payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ServiceOrderPaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = Payment.objects.create(
            order=order,
            amount=order.total,
            method=serializer.validated_data.get("method", "SIMULATED"),
        )

        order.status = ServiceOrder.Status.PAID
        order.save(update_fields=["status"])

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="invoice.pdf")
    def invoice(self, request, pk=None):
        order = self.get_object()

        if order.status not in (
            ServiceOrder.Status.COMPLETED,
            ServiceOrder.Status.PAID,
        ):
            return Response(
                {"detail": "Invoice is only available for COMPLETED or PAID orders."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        html_string = render_to_string(
            "invoice.html",
            {
                "order": order,
                "company_name": settings.COMPANY_NAME,
                "company_address": settings.COMPANY_ADDRESS,
                "company_gstin": settings.COMPANY_GSTIN,
                "issued_at": timezone.now(),
            },
        )

        pdf_bytes = HTML(string=html_string).write_pdf()

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="Invoice-{order.order_number}.pdf"'
        )
        return response

    @action(detail=True, methods=["get"], url_path=r"compare/(?P<component_id>\d+)")
    def compare(self, request, pk=None, component_id=None):
        self.get_object()  # ensure order exists and user has access

        try:
            component = Component.objects.get(pk=component_id, is_active=True)
        except Component.DoesNotExist:
            return Response(
                {"detail": "Component not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Determine new_part and repair_service
        if component.component_type == Component.ComponentType.NEW_PART:
            new_part = component
            repair_service = component.repair_alternative
        elif component.component_type == Component.ComponentType.REPAIR_SERVICE:
            repair_service = component
            # Find the new part that links to this repair
            new_part = Component.objects.filter(
                repair_alternative=component, is_active=True
            ).first()
        else:
            return Response(
                {"detail": "Invalid component type."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_part or not repair_service:
            return Response(
                {"detail": "No repair alternative available for this component."},
                status=status.HTTP_404_NOT_FOUND,
            )

        savings_amount = new_part.unit_price - repair_service.unit_price
        savings_percent = (
            (savings_amount / new_part.unit_price * Decimal("100")).quantize(Decimal("0.01"))
            if new_part.unit_price > 0
            else Decimal("0")
        )

        def _option(comp):
            return {
                "id": comp.id,
                "name": comp.name,
                "sku": comp.sku,
                "component_type": comp.component_type,
                "unit_price": comp.unit_price,
                "labor_hours": comp.labor_hours,
                "stock_quantity": comp.stock_quantity,
            }

        data = {
            "new_part": _option(new_part),
            "repair_service": _option(repair_service),
            "savings_amount": savings_amount,
            "savings_percent": savings_percent,
        }

        return Response(CompareResponseSerializer(data).data)


class RevenueViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"], url_path="timeseries")
    def timeseries(self, request):
        granularity = request.query_params.get("granularity", "month")
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        trunc_map = {
            "day": TruncDay,
            "month": TruncMonth,
            "year": TruncYear,
        }
        trunc_fn = trunc_map.get(granularity, TruncMonth)

        qs = Payment.objects.all()
        if start:
            qs = qs.filter(paid_at__gte=start)
        if end:
            qs = qs.filter(paid_at__lte=end)

        buckets = (
            qs.annotate(bucket=trunc_fn("paid_at"))
            .values("bucket")
            .annotate(revenue=Sum("amount"), orders=Count("id"))
            .order_by("bucket")
        )

        result = []
        for b in buckets:
            result.append({
                "bucket": b["bucket"].isoformat() if b["bucket"] else None,
                "revenue": b["revenue"] or Decimal("0"),
                "orders": b["orders"],
            })

        return Response(RevenueBucketSerializer(result, many=True).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        qs = Payment.objects.all()
        if start:
            qs = qs.filter(paid_at__gte=start)
        if end:
            qs = qs.filter(paid_at__lte=end)

        agg = qs.aggregate(
            total_revenue=Sum("amount"),
            order_count=Count("id"),
        )

        total = agg["total_revenue"] or Decimal("0")
        count = agg["order_count"] or 0
        avg = (total / count).quantize(Decimal("0.01")) if count > 0 else Decimal("0")

        data = {
            "total_revenue": total,
            "order_count": count,
            "avg_order_value": avg,
        }

        return Response(RevenueSummarySerializer(data).data)

    @action(detail=False, methods=["get"], url_path="drill-down")
    def drill_down(self, request):
        bucket = request.query_params.get("bucket")
        granularity = request.query_params.get("granularity", "day")

        if not bucket:
            return Response(
                {"detail": "bucket parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from datetime import datetime

        from dateutil.relativedelta import relativedelta

        try:
            dt = datetime.fromisoformat(bucket)
        except ValueError:
            return Response(
                {"detail": "Invalid bucket format. Use ISO 8601."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if granularity == "day":
            start = dt
            end = dt + relativedelta(days=1)
        elif granularity == "month":
            start = dt.replace(day=1)
            end = start + relativedelta(months=1)
        else:  # year
            start = dt.replace(month=1, day=1)
            end = start + relativedelta(years=1)

        orders = ServiceOrder.objects.filter(
            payment__paid_at__gte=start,
            payment__paid_at__lt=end,
        ).select_related("vehicle").prefetch_related("payment")

        return Response(ServiceOrderReadSerializer(orders, many=True).data)

    @action(detail=False, methods=["get"], url_path="top-components")
    def top_components(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        qs = ServiceItem.objects.filter(order__payment__isnull=False)
        if start:
            qs = qs.filter(order__payment__paid_at__gte=start)
        if end:
            qs = qs.filter(order__payment__paid_at__lte=end)

        top = (
            qs.values(
                "component__id", "component__name", "component__sku",
                "component__component_type",
            )
            .annotate(revenue=Sum("line_total"), units=Sum("quantity"))
            .order_by("-revenue")[:5]
        )

        return Response([
            {
                "id": t["component__id"],
                "name": t["component__name"],
                "sku": t["component__sku"],
                "component_type": t["component__component_type"],
                "revenue": t["revenue"] or Decimal("0"),
                "units": t["units"] or 0,
            }
            for t in top
        ])
