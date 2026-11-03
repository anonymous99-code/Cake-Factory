from django.db import models
from products.models import Product


class ProductAvailability(models.Model):

    class Status(models.TextChoices):
        UPCOMING = "UPCOMING", "Upcoming"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready"
        SOLD_OUT = "SOLD_OUT", "Sold Out"
        UNAVAILABLE = "UNAVAILABLE", "Unavailable"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="availability_schedules",
    )

    date = models.DateField()

    expected_ready_time = models.TimeField(
        null=True,
        blank=True,
    )

    available_quantity = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPCOMING,
    )

    notes = models.CharField(
        max_length=255,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "expected_ready_time"]

    def __str__(self):
        return f"{self.product.name} - {self.date}"