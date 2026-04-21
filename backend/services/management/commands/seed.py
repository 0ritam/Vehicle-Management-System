import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from services.models import Component, Payment, ServiceItem, ServiceOrder, Vehicle


class Command(BaseCommand):
    help = "Seed the database with sample data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        # Clear existing data
        Payment.objects.all().delete()
        ServiceItem.objects.all().delete()
        ServiceOrder.objects.all().delete()
        Vehicle.objects.all().delete()
        Component.objects.all().delete()

        components = self._create_components()
        vehicles = self._create_vehicles()
        self._create_service_orders(components, vehicles)

        self.stdout.write(self.style.SUCCESS("Seeding complete!"))

    def _create_components(self) -> list[Component]:
        parts_data = [
            ("Brake Pad Set", "BP-001", Decimal("2500.00"), Decimal("1.5"), 25),
            ("Oil Filter", "OF-001", Decimal("450.00"), Decimal("0.5"), 50),
            ("Clutch Plate", "CP-001", Decimal("4500.00"), Decimal("3.0"), 10),
            ("Air Filter", "AF-001", Decimal("800.00"), Decimal("0.5"), 40),
            ("Spark Plug Set", "SP-001", Decimal("1200.00"), Decimal("1.0"), 30),
            ("Timing Belt", "TB-001", Decimal("3500.00"), Decimal("2.5"), 8),
            ("Radiator", "RD-001", Decimal("6500.00"), Decimal("2.0"), 5),
            ("Alternator", "AL-001", Decimal("7500.00"), Decimal("2.0"), 6),
            ("Starter Motor", "SM-001", Decimal("5500.00"), Decimal("1.5"), 7),
            ("Shock Absorber Set", "SA-001", Decimal("8000.00"), Decimal("3.0"), 4),
        ]

        repair_data = [
            ("Brake Pad Repair", "BP-R01", Decimal("1200.00"), Decimal("2.0")),
            ("Oil System Flush", "OF-R01", Decimal("300.00"), Decimal("1.0")),
            ("Clutch Adjustment", "CP-R01", Decimal("2000.00"), Decimal("2.5")),
            ("Air Filter Cleaning", "AF-R01", Decimal("200.00"), Decimal("0.3")),
            ("Spark Plug Cleaning", "SP-R01", Decimal("400.00"), Decimal("0.5")),
            ("Timing Belt Adjustment", "TB-R01", Decimal("1500.00"), Decimal("2.0")),
            ("Radiator Repair", "RD-R01", Decimal("3000.00"), Decimal("3.0")),
            ("Alternator Repair", "AL-R01", Decimal("3500.00"), Decimal("3.0")),
            ("Starter Motor Repair", "SM-R01", Decimal("2500.00"), Decimal("2.0")),
            ("Shock Absorber Repair", "SA-R01", Decimal("4000.00"), Decimal("3.5")),
        ]

        new_parts = []
        for name, sku, price, labor, stock in parts_data:
            new_parts.append(
                Component.objects.create(
                    name=name,
                    sku=sku,
                    component_type=Component.ComponentType.NEW_PART,
                    unit_price=price,
                    labor_hours=labor,
                    stock_quantity=stock,
                )
            )

        repair_services = []
        for name, sku, price, labor in repair_data:
            repair_services.append(
                Component.objects.create(
                    name=name,
                    sku=sku,
                    component_type=Component.ComponentType.REPAIR_SERVICE,
                    unit_price=price,
                    labor_hours=labor,
                    stock_quantity=0,
                )
            )

        # Link repair alternatives
        for new_part, repair in zip(new_parts, repair_services):
            new_part.repair_alternative = repair
            new_part.save(update_fields=["repair_alternative"])

        self.stdout.write(f"  Created {len(new_parts) + len(repair_services)} components")
        return new_parts + repair_services

    def _create_vehicles(self) -> list[Vehicle]:
        vehicles_data = [
            ("KA-01-AB-1234", "Maruti Suzuki", "Swift", 2022, "Rahul Sharma", "9876543210"),
            ("KA-02-CD-5678", "Hyundai", "i20", 2021, "Priya Patel", "9876543211"),
            ("KA-03-EF-9012", "Tata", "Nexon", 2023, "Amit Kumar", "9876543212"),
            ("MH-01-GH-3456", "Honda", "City", 2020, "Sneha Reddy", "9876543213"),
            ("MH-02-IJ-7890", "Toyota", "Innova", 2019, "Vikram Singh", "9876543214"),
            ("DL-01-KL-2345", "Kia", "Seltos", 2023, "Ananya Gupta", "9876543215"),
            ("DL-02-MN-6789", "Mahindra", "XUV700", 2024, "Rajesh Nair", "9876543216"),
            ("TN-01-OP-0123", "Volkswagen", "Polo", 2018, "Deepa Iyer", "9876543217"),
            ("TN-02-QR-4567", "Skoda", "Slavia", 2023, "Suresh Menon", "9876543218"),
            ("KA-04-ST-8901", "MG", "Hector", 2022, "Kavitha Rao", "9876543219"),
            ("KA-05-UV-2345", "Renault", "Kiger", 2021, "Arjun Das", "9876543220"),
            ("MH-03-WX-6789", "Nissan", "Magnite", 2022, "Meera Joshi", "9876543221"),
            ("DL-03-YZ-0123", "Citroen", "C3", 2023, "Naveen Yadav", "9876543222"),
            ("TN-03-AB-4567", "Maruti Suzuki", "Brezza", 2024, "Lakshmi Pillai", "9876543223"),
            ("KA-06-CD-8901", "Hyundai", "Creta", 2023, "Sanjay Hegde", "9876543224"),
        ]

        vehicles = []
        for reg, make, model, year, owner, contact in vehicles_data:
            vehicles.append(
                Vehicle.objects.create(
                    registration_number=reg,
                    make=make,
                    model=model,
                    year=year,
                    owner_name=owner,
                    owner_contact=contact,
                )
            )

        self.stdout.write(f"  Created {len(vehicles)} vehicles")
        return vehicles

    def _create_service_orders(
        self, components: list[Component], vehicles: list[Vehicle]
    ):
        now = timezone.now()
        new_parts = [c for c in components if c.component_type == Component.ComponentType.NEW_PART]
        repair_services = [c for c in components if c.component_type == Component.ComponentType.REPAIR_SERVICE]

        issues = [
            "Engine making unusual noise",
            "Brakes not responsive",
            "Oil leak detected",
            "AC not cooling properly",
            "Clutch slipping",
            "Battery draining fast",
            "Suspension feels rough",
            "Check engine light on",
            "Steering wheel vibration",
            "Exhaust smoke visible",
            "Gear shifting issues",
            "Overheating engine",
            "Windshield wipers not working",
            "Headlight alignment needed",
            "Tire pressure warning",
        ]

        statuses_with_weights = [
            (ServiceOrder.Status.PAID, 40),
            (ServiceOrder.Status.COMPLETED, 15),
            (ServiceOrder.Status.IN_PROGRESS, 15),
            (ServiceOrder.Status.QUOTED, 10),
            (ServiceOrder.Status.DRAFT, 10),
            (ServiceOrder.Status.CANCELLED, 10),
        ]
        status_choices = []
        for status, weight in statuses_with_weights:
            status_choices.extend([status] * weight)

        orders_created = 0
        payments_created = 0

        for i in range(30):
            days_ago = random.randint(0, 90)
            created = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            vehicle = random.choice(vehicles)
            status = random.choice(status_choices)

            order = ServiceOrder(
                vehicle=vehicle,
                issue_description=random.choice(issues),
                status=status,
                labor_rate=Decimal("500"),
                tax_rate=Decimal("18"),
                discount_amount=Decimal(random.choice([0, 0, 0, 100, 200, 500])),
            )
            order.save()

            # Backdate created_at
            ServiceOrder.objects.filter(pk=order.pk).update(created_at=created)

            # Add 1-4 items per order
            num_items = random.randint(1, 4)
            chosen = random.sample(
                new_parts + repair_services, min(num_items, len(components))
            )
            for comp in chosen:
                ServiceItem.objects.create(
                    order=order,
                    component=comp,
                    quantity=random.randint(1, 3),
                )

            order.recalculate()

            if status == ServiceOrder.Status.COMPLETED:
                completed_at = created + timedelta(days=random.randint(1, 5))
                ServiceOrder.objects.filter(pk=order.pk).update(completed_at=completed_at)

            if status == ServiceOrder.Status.PAID:
                completed_at = created + timedelta(days=random.randint(1, 5))
                paid_at = completed_at + timedelta(hours=random.randint(1, 48))
                ServiceOrder.objects.filter(pk=order.pk).update(completed_at=completed_at)
                payment = Payment.objects.create(
                    order=order,
                    amount=order.total,
                    method=random.choice(["CASH", "CARD", "UPI", "SIMULATED"]),
                )
                Payment.objects.filter(pk=payment.pk).update(paid_at=paid_at)
                payments_created += 1

            orders_created += 1

        self.stdout.write(f"  Created {orders_created} service orders")
        self.stdout.write(f"  Created {payments_created} payments")
