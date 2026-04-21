from decimal import Decimal

import pytest

from services.models import Component, Payment, ServiceOrder

from .factories import (
    ComponentFactory,
    RepairComponentFactory,
    ServiceOrderFactory,
    VehicleFactory,
)


pytestmark = pytest.mark.django_db


class TestAuth:
    def test_unauthenticated_request_returns_401(self, api_client):
        response = api_client.get("/api/components/")
        assert response.status_code == 401

    def test_authenticated_request_succeeds(self, auth_client):
        response = auth_client.get("/api/components/")
        assert response.status_code == 200


class TestOrderFlow:
    def test_create_order_then_add_item_updates_totals(self, auth_client):
        vehicle = VehicleFactory()
        component = ComponentFactory(
            unit_price=Decimal("1000.00"), labor_hours=Decimal("1.00")
        )

        # 1. Create order
        create_response = auth_client.post(
            "/api/service-orders/",
            {
                "vehicle_id": vehicle.id,
                "issue_description": "Integration test",
            },
            format="json",
        )
        assert create_response.status_code == 201
        order_id = create_response.data["id"]
        assert create_response.data["total"] == "0.00"
        assert create_response.data["status"] == "DRAFT"

        # 2. Add an item
        add_response = auth_client.post(
            f"/api/service-orders/{order_id}/add-item/",
            {"component_id": component.id, "quantity": 3},
            format="json",
        )
        assert add_response.status_code == 201
        assert add_response.data["unit_price_snapshot"] == "1000.00"
        assert add_response.data["line_total"] == "3000.00"

        # 3. Fetch order — totals should be recalculated
        detail = auth_client.get(f"/api/service-orders/{order_id}/").data
        # parts = 3000, labor = 1.00*500 = 500, subtotal = 3500
        # tax = 3500 * 0.18 = 630, total = 4130
        assert detail["subtotal"] == "3500.00"
        assert detail["tax_amount"] == "630.00"
        assert detail["total"] == "4130.00"
        assert len(detail["items"]) == 1

    def test_remove_item_recalculates_totals(self, auth_client):
        order = ServiceOrderFactory()
        component = ComponentFactory(unit_price=Decimal("1000.00"))
        add_response = auth_client.post(
            f"/api/service-orders/{order.id}/add-item/",
            {"component_id": component.id, "quantity": 1},
            format="json",
        )
        item_id = add_response.data["id"]

        delete_response = auth_client.delete(
            f"/api/service-orders/{order.id}/items/{item_id}/"
        )
        assert delete_response.status_code == 204

        detail = auth_client.get(f"/api/service-orders/{order.id}/").data
        assert detail["total"] == "0.00"
        assert len(detail["items"]) == 0


class TestStatusTransitions:
    def test_illegal_draft_to_paid_transition_returns_400(self, auth_client):
        order = ServiceOrderFactory()
        response = auth_client.post(
            f"/api/service-orders/{order.id}/transition/",
            {"status": "PAID"},
            format="json",
        )
        assert response.status_code == 400
        assert "Cannot transition" in response.data["detail"]

    def test_legal_draft_to_quoted_transition(self, auth_client):
        order = ServiceOrderFactory()
        response = auth_client.post(
            f"/api/service-orders/{order.id}/transition/",
            {"status": "QUOTED"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["status"] == "QUOTED"

    def test_completed_sets_completed_at(self, auth_client):
        order = ServiceOrderFactory(status=ServiceOrder.Status.IN_PROGRESS)
        response = auth_client.post(
            f"/api/service-orders/{order.id}/transition/",
            {"status": "COMPLETED"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["completed_at"] is not None


class TestPay:
    def test_pay_endpoint_creates_payment_and_sets_paid(self, auth_client):
        order = ServiceOrderFactory(
            status=ServiceOrder.Status.COMPLETED, total=Decimal("1180.00")
        )

        response = auth_client.post(
            f"/api/service-orders/{order.id}/pay/",
            {"method": "CARD"},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["method"] == "CARD"
        assert response.data["reference"].startswith("PAY-")

        order.refresh_from_db()
        assert order.status == ServiceOrder.Status.PAID
        assert Payment.objects.filter(order=order).exists()

    def test_cannot_pay_non_completed_order(self, auth_client):
        order = ServiceOrderFactory(status=ServiceOrder.Status.DRAFT)
        response = auth_client.post(
            f"/api/service-orders/{order.id}/pay/",
            {"method": "CASH"},
            format="json",
        )
        assert response.status_code == 400

    def test_cannot_pay_twice(self, auth_client):
        order = ServiceOrderFactory(status=ServiceOrder.Status.COMPLETED)
        auth_client.post(
            f"/api/service-orders/{order.id}/pay/", {}, format="json"
        )
        # Second payment should fail
        response = auth_client.post(
            f"/api/service-orders/{order.id}/pay/", {}, format="json"
        )
        assert response.status_code == 400


class TestCompare:
    def test_returns_new_and_repair_options_with_savings(self, auth_client):
        repair = RepairComponentFactory(unit_price=Decimal("1000.00"))
        new_part = ComponentFactory(
            component_type=Component.ComponentType.NEW_PART,
            unit_price=Decimal("2500.00"),
            repair_alternative=repair,
        )
        order = ServiceOrderFactory()

        response = auth_client.get(
            f"/api/service-orders/{order.id}/compare/{new_part.id}/"
        )
        assert response.status_code == 200
        assert response.data["new_part"]["id"] == new_part.id
        assert response.data["repair_service"]["id"] == repair.id
        # savings = 2500 - 1000 = 1500
        assert Decimal(response.data["savings_amount"]) == Decimal("1500.00")
        # percent = 1500 / 2500 * 100 = 60.00
        assert Decimal(response.data["savings_percent"]) == Decimal("60.00")

    def test_compare_works_from_repair_side_too(self, auth_client):
        repair = RepairComponentFactory(unit_price=Decimal("500.00"))
        new_part = ComponentFactory(
            unit_price=Decimal("1500.00"),
            repair_alternative=repair,
        )
        order = ServiceOrderFactory()

        response = auth_client.get(
            f"/api/service-orders/{order.id}/compare/{repair.id}/"
        )
        assert response.status_code == 200
        assert response.data["new_part"]["id"] == new_part.id

    def test_compare_returns_404_when_no_alternative(self, auth_client):
        # A component with no repair_alternative
        orphan = ComponentFactory()
        order = ServiceOrderFactory()

        response = auth_client.get(
            f"/api/service-orders/{order.id}/compare/{orphan.id}/"
        )
        assert response.status_code == 404


class TestInvoice:
    def test_invoice_rejected_for_draft_order(self, auth_client):
        order = ServiceOrderFactory(status=ServiceOrder.Status.DRAFT)
        response = auth_client.get(
            f"/api/service-orders/{order.id}/invoice.pdf/"
        )
        assert response.status_code == 400

    def test_invoice_returns_pdf_for_completed_order(self, auth_client):
        order = ServiceOrderFactory(status=ServiceOrder.Status.COMPLETED)
        response = auth_client.get(
            f"/api/service-orders/{order.id}/invoice.pdf/"
        )
        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert "attachment" in response["Content-Disposition"]
        assert order.order_number in response["Content-Disposition"]
        # Sanity check the body is a PDF
        assert response.content[:4] == b"%PDF"
