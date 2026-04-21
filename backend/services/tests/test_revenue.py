from datetime import datetime
from decimal import Decimal

import pytest
from django.utils import timezone

from services.models import Payment, ServiceOrder

from .factories import ServiceOrderFactory


pytestmark = pytest.mark.django_db


def make_paid_order(amount: Decimal, paid_at: datetime) -> ServiceOrder:
    """Factory helper: creates a PAID order with a payment at the specified date."""
    order = ServiceOrderFactory(status=ServiceOrder.Status.PAID, total=amount)
    payment = Payment.objects.create(order=order, amount=amount, method="SIMULATED")
    # auto_now_add means we have to overwrite paid_at explicitly
    Payment.objects.filter(pk=payment.pk).update(paid_at=paid_at)
    return order


class TestRevenueTimeseries:
    def test_monthly_buckets(self, auth_client):
        tz = timezone.get_current_timezone()
        make_paid_order(Decimal("1000.00"), datetime(2026, 1, 15, 10, 0, tzinfo=tz))
        make_paid_order(Decimal("2000.00"), datetime(2026, 1, 20, 12, 0, tzinfo=tz))
        make_paid_order(Decimal("5000.00"), datetime(2026, 2, 5, 10, 0, tzinfo=tz))
        make_paid_order(Decimal("500.00"), datetime(2026, 3, 10, 14, 0, tzinfo=tz))

        response = auth_client.get(
            "/api/revenue/timeseries/?granularity=month"
            "&start=2026-01-01T00:00:00"
            "&end=2026-04-01T00:00:00"
        )
        assert response.status_code == 200
        buckets = response.data

        assert len(buckets) == 3
        # Jan: 1000 + 2000 = 3000, 2 orders
        assert Decimal(buckets[0]["revenue"]) == Decimal("3000.00")
        assert buckets[0]["orders"] == 2
        # Feb: 5000, 1 order
        assert Decimal(buckets[1]["revenue"]) == Decimal("5000.00")
        assert buckets[1]["orders"] == 1
        # Mar: 500, 1 order
        assert Decimal(buckets[2]["revenue"]) == Decimal("500.00")
        assert buckets[2]["orders"] == 1

    def test_daily_granularity(self, auth_client):
        tz = timezone.get_current_timezone()
        make_paid_order(Decimal("100.00"), datetime(2026, 4, 1, 10, 0, tzinfo=tz))
        make_paid_order(Decimal("200.00"), datetime(2026, 4, 1, 15, 0, tzinfo=tz))
        make_paid_order(Decimal("300.00"), datetime(2026, 4, 2, 10, 0, tzinfo=tz))

        response = auth_client.get(
            "/api/revenue/timeseries/?granularity=day"
            "&start=2026-04-01T00:00:00"
            "&end=2026-04-03T00:00:00"
        )
        assert response.status_code == 200
        buckets = response.data

        assert len(buckets) == 2
        assert Decimal(buckets[0]["revenue"]) == Decimal("300.00")
        assert buckets[0]["orders"] == 2
        assert Decimal(buckets[1]["revenue"]) == Decimal("300.00")
        assert buckets[1]["orders"] == 1

    def test_empty_range_returns_empty_list(self, auth_client):
        response = auth_client.get(
            "/api/revenue/timeseries/?granularity=month"
            "&start=2030-01-01T00:00:00"
            "&end=2030-12-31T00:00:00"
        )
        assert response.status_code == 200
        assert response.data == []


class TestRevenueSummary:
    def test_totals_and_average(self, auth_client):
        tz = timezone.get_current_timezone()
        make_paid_order(Decimal("1000.00"), datetime(2026, 3, 1, 10, 0, tzinfo=tz))
        make_paid_order(Decimal("2000.00"), datetime(2026, 3, 15, 10, 0, tzinfo=tz))
        make_paid_order(Decimal("3000.00"), datetime(2026, 3, 20, 10, 0, tzinfo=tz))

        response = auth_client.get("/api/revenue/summary/")
        assert response.status_code == 200

        assert Decimal(response.data["total_revenue"]) == Decimal("6000.00")
        assert response.data["order_count"] == 3
        assert Decimal(response.data["avg_order_value"]) == Decimal("2000.00")

    def test_zero_orders_returns_zeros(self, auth_client):
        response = auth_client.get("/api/revenue/summary/")
        assert response.status_code == 200
        assert Decimal(response.data["total_revenue"]) == Decimal("0")
        assert response.data["order_count"] == 0


class TestDrillDown:
    def test_returns_orders_in_the_bucket(self, auth_client):
        tz = timezone.get_current_timezone()
        in_bucket = make_paid_order(
            Decimal("1000.00"), datetime(2026, 4, 15, 10, 0, tzinfo=tz)
        )
        make_paid_order(
            Decimal("1000.00"), datetime(2026, 4, 15, 22, 0, tzinfo=tz)
        )
        # Outside the bucket (different day)
        make_paid_order(
            Decimal("9999.00"), datetime(2026, 4, 16, 10, 0, tzinfo=tz)
        )

        response = auth_client.get(
            "/api/revenue/drill-down/"
            "?bucket=2026-04-15T00:00:00"
            "&granularity=day"
        )
        assert response.status_code == 200
        assert len(response.data) == 2
        returned_ids = {o["id"] for o in response.data}
        assert in_bucket.id in returned_ids

    def test_missing_bucket_param_returns_400(self, auth_client):
        response = auth_client.get("/api/revenue/drill-down/")
        assert response.status_code == 400


class TestTopComponents:
    def test_returns_top_components_by_revenue(self, auth_client):
        from .factories import ComponentFactory, ServiceItemFactory

        tz = timezone.get_current_timezone()
        order = ServiceOrderFactory(status=ServiceOrder.Status.PAID)
        Payment.objects.create(
            order=order, amount=Decimal("5000.00"), method="SIMULATED"
        )
        Payment.objects.filter(order=order).update(
            paid_at=datetime(2026, 3, 15, 10, 0, tzinfo=tz)
        )

        big = ComponentFactory(name="Expensive Part", unit_price=Decimal("2000.00"))
        small = ComponentFactory(name="Cheap Part", unit_price=Decimal("100.00"))

        ServiceItemFactory(order=order, component=big, quantity=2)
        ServiceItemFactory(order=order, component=small, quantity=1)

        response = auth_client.get("/api/revenue/top-components/")
        assert response.status_code == 200
        # Big part should be ranked first (2 * 2000 = 4000 > 100)
        assert response.data[0]["name"] == "Expensive Part"
        assert Decimal(str(response.data[0]["revenue"])) == Decimal("4000.00")
