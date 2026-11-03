from django.db import models


class Product(models.Model):

    class Category(models.TextChoices):
        SNACKS = "SNACKS", "Snacks"
        CAKES = "CAKES", "Cakes"
        SMALL_CHOPS = "SMALL_CHOPS", "Small Chops"
        OTHER = "OTHER", "Other"

    name = models.CharField(max_length=150)

    description = models.TextField(blank=True)

    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.SNACKS,
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True,
    )

    available_quantity = models.PositiveIntegerField(default=0)

    estimated_preparation_minutes = models.PositiveIntegerField(
        default=30,
    )

    is_available = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name