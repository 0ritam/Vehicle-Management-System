from decimal import Decimal

import pytest

from services.models import Component, ServiceOrder

from .factories import (
    ComponentFactory,
    RepairComponentFactory,
    ServiceItemFactory,
    ServiceOrderFactory,
)


pytestmark = pytest.mark.django_db


class TestServiceItemSnapshot:
    def test_snapshots_unit_price_on_save(self):
        component = ComponentFactory(unit_price=Decimal("2500.00"))
        item = ServiceItemFactory(component=component, quantity=1)

        assert item.unit_price_snapshot == Decimal("2500.00")

    def test_snapshot_preserved_when_component_price_changes(self):
        """Historical orders must not change when component prices change."""
        component = ComponentFactory(unit_price=Decimal("2500.00"))
        item = ServiceItemFactory(component=component, quantity=2)

        # Price goes up after the item is saved
        component.unit_price = Decimal("9999.99")
        component.save()

        item.refresh_from_db()
        assert item.unit_price_snapshot == Decimal("2500.00")
        assert item.line_total == Decimal("5000.00")

    def test_line_total_is_snapshot_times_quantity(self):
        component = ComponentFactory(unit_price=Decimal("750.50"))
        item = ServiceItemFactory(component=component, quantity=4)

        assert item.line_total == Decimal("3002.00")

    def test_item_type_derived_from_component(self):
        new_part = ComponentFactory(
            component_type=Component.ComponentType.NEW_PART
        )
        repair = RepairComponentFactory()

        new_item = ServiceItemFactory(component=new_part)
        repair_item = ServiceItemFactory(component=repair)

        assert new_item.item_type == "NEW"
        assert repair_item.item_type == "REPAIR"


class TestRecalculate:
    def test_mixed_items_labor_tax_and_discount(self):
        order = ServiceOrderFactory(
            labor_rate=Decimal("500.00"),
            tax_rate=Decimal("18.00"),
            discount_amount=Decimal("100.00"),
        )
        part = ComponentFactory(
            unit_price=Decimal("2000.00"), labor_hours=Decimal("1.50")
        )
        repair = RepairComponentFactory(
            unit_price=Decimal("800.00"), labor_hours=Decimal("2.00")
        )

        ServiceItemFactory(order=order, component=part, quantity=2)
        ServiceItemFactory(order=order, component=repair, quantity=1)

        order.recalculate()
        order.refresh_from_db()

        # parts = 2*2000 + 1*800 = 4800
        # labor = 1.50*500 + 2.00*500 = 1750 (per-item, not multiplied by qty)
        # subtotal = 6550
        # after_discount = 6550 - 100 = 6450
        # tax = 6450 * 0.18 = 1161.00
        # total = 6450 + 1161 = 7611.00
        assert order.subtotal == Decimal("6550.00")
        assert order.tax_amount == Decimal("1161.00")
        assert order.total == Decimal("7611.00")

    def test_zero_items_zero_totals(self):
        order = ServiceOrderFactory()
        order.recalculate()
        order.refresh_from_db()

        assert order.subtotal == Decimal("0.00")
        assert order.tax_amount == Decimal("0.00")
        assert order.total == Decimal("0.00")


class TestOrderNumber:
    def test_generates_sequential_order_numbers_for_current_year(self):
        o1 = ServiceOrderFactory()
        o2 = ServiceOrderFactory()
        o3 = ServiceOrderFactory()

        numbers = [o.order_number for o in (o1, o2, o3)]

        # Both have same prefix
        prefixes = {n.rsplit("-", 1)[0] for n in numbers}
        assert len(prefixes) == 1
        assert list(prefixes)[0].startswith("SO-")

        # Sequence increases
        seqs = [int(n.rsplit("-", 1)[1]) for n in numbers]
        assert seqs == sorted(seqs)
        assert seqs[-1] - seqs[0] == 2

    def test_order_number_not_overwritten_on_update(self):
        order = ServiceOrderFactory()
        original = order.order_number

        order.issue_description = "updated"
        order.save()

        assert order.order_number == original


class TestPaymentReference:
    def test_generates_unique_reference_on_save(self):
        from .factories import PaymentFactory

        p1 = PaymentFactory()
        p2 = PaymentFactory()

        assert p1.reference.startswith("PAY-")
        assert p2.reference.startswith("PAY-")
        assert p1.reference != p2.reference
