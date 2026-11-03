from decimal import Decimal

from django.core.management.base import BaseCommand

from products.models import Product

DEMO = [
    ("Meat Pie", "Flaky golden pastry filled with seasoned minced beef and potato.", "SNACKS", "500", 50, 25),
    ("Sausage Roll", "Buttery pastry wrapped around a juicy sausage.", "SNACKS", "400", 40, 25),
    ("Chicken Pie", "Creamy chicken and vegetable filling in a crisp crust.", "SNACKS", "600", 30, 30),
    ("Doughnut", "Soft, sugar-dusted and freshly fried.", "SNACKS", "300", 60, 20),
    ("Vanilla Celebration Cake", "Light vanilla sponge with buttercream. Order ahead for custom designs.", "CAKES", "18000", 3, 180),
    ("Small Chops Platter", "Spring rolls, samosa, puff-puff and chicken wings.", "SMALL_CHOPS", "7500", 10, 45),
]


class Command(BaseCommand):
    help = "Optional: add a few sample products so you can see the shop design. Skips names that already exist."

    def handle(self, *args, **options):
        created = 0
        for name, description, category, price, qty, minutes in DEMO:
            _, was_created = Product.objects.get_or_create(
                name=name,
                defaults=dict(
                    description=description,
                    category=category,
                    price=Decimal(price),
                    available_quantity=qty,
                    estimated_preparation_minutes=minutes,
                ),
            )
            created += was_created
        self.stdout.write(self.style.SUCCESS(f"Added {created} sample product(s)."))
