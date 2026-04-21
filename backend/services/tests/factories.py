from decimal import Decimal

import factory
from django.contrib.auth import get_user_model

from services.models import Component, Payment, ServiceItem, ServiceOrder, Vehicle

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user{n}")
    password = factory.PostGenerationMethodCall("set_password", "pass123")


class ComponentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Component

    name = factory.Sequence(lambda n: f"Component {n}")
    sku = factory.Sequence(lambda n: f"CMP-{n:04d}")
    component_type = Component.ComponentType.NEW_PART
    unit_price = Decimal("1000.00")
    labor_hours = Decimal("1.00")
    stock_quantity = 10


class RepairComponentFactory(ComponentFactory):
    component_type = Component.ComponentType.REPAIR_SERVICE
    unit_price = Decimal("500.00")
    labor_hours = Decimal("2.00")
    stock_quantity = 0


class VehicleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Vehicle

    registration_number = factory.Sequence(lambda n: f"KA-01-AB-{n:04d}")
    make = "Maruti"
    model = "Swift"
    year = 2022
    owner_name = factory.Sequence(lambda n: f"Owner {n}")
    owner_contact = "9876543210"


class ServiceOrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ServiceOrder

    vehicle = factory.SubFactory(VehicleFactory)
    issue_description = "Test issue"
    labor_rate = Decimal("500.00")
    tax_rate = Decimal("18.00")
    discount_amount = Decimal("0.00")


class ServiceItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ServiceItem

    order = factory.SubFactory(ServiceOrderFactory)
    component = factory.SubFactory(ComponentFactory)
    quantity = 1


class PaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Payment

    order = factory.SubFactory(ServiceOrderFactory)
    amount = Decimal("1180.00")
    method = "SIMULATED"
