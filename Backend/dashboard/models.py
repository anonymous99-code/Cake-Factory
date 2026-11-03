from decimal import Decimal

from django.db import models


class SiteSettings(models.Model):
    """
    Business details and rules the owner can change from the admin dashboard.
    There is only ever one row (pk=1); use SiteSettings.load().
    """

    business_name = models.CharField(max_length=120, default="Cake Factory")
    tagline = models.CharField(
        max_length=200,
        blank=True,
        default="Freshly made snacks, cakes and catering",
    )

    # Contact details. Left blank until the owner enters them.
    whatsapp_number = models.CharField(
        max_length=20,
        blank=True,
        help_text="International format without + or spaces, e.g. 2348012345678",
    )
    phone_number = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    notify_email = models.EmailField(
        blank=True,
        help_text="New orders and inquiries are emailed here. Not shown on the website.",
    )
    address = models.TextField(blank=True)
    google_maps_url = models.URLField(blank=True)
    opening_hours = models.TextField(blank=True)
    about_text = models.TextField(
        blank=True,
        help_text="Shown on the About page. Separate paragraphs with a blank line.",
    )

    # Orders and delivery
    accepts_orders = models.BooleanField(default=True)
    delivery_enabled = models.BooleanField(default=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    free_delivery_threshold = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Orders at or above this subtotal get free delivery. Leave empty for none.",
    )
    delivery_policy = models.TextField(blank=True)
    max_advance_days = models.PositiveIntegerField(default=30)

    # Inventory
    low_stock_threshold = models.PositiveIntegerField(default=5)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Site settings"
        verbose_name_plural = "Site settings"

    def __str__(self):
        return "Site settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Expense(models.Model):
    """Business spending, so profit can be estimated honestly."""

    class Category(models.TextChoices):
        INGREDIENTS = "INGREDIENTS", "Ingredients"
        PACKAGING = "PACKAGING", "Packaging"
        TRANSPORT = "TRANSPORT", "Transport / delivery"
        UTILITIES = "UTILITIES", "Gas, power and utilities"
        STAFF = "STAFF", "Staff"
        OTHER = "OTHER", "Other"

    date = models.DateField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.INGREDIENTS)
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.description} ({self.amount})"
