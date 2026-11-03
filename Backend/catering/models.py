from django.db import models


class CateringInquiry(models.Model):

    class ServiceType(models.TextChoices):
        CATERING = "CATERING", "Catering"
        EVENT_PLANNING = "EVENT_PLANNING", "Event Planning"
        BOTH = "BOTH", "Catering and Event Planning"

    class Status(models.TextChoices):
        NEW = "NEW", "New Inquiry"
        CONTACTED = "CONTACTED", "Customer Contacted"
        QUOTATION_SENT = "QUOTATION_SENT", "Quotation Sent"
        ACCEPTED = "ACCEPTED", "Accepted"
        DECLINED = "DECLINED", "Declined"

    customer_name = models.CharField(max_length=150)

    customer_phone = models.CharField(max_length=20)

    customer_email = models.EmailField(blank=True)

    service_type = models.CharField(
        max_length=20,
        choices=ServiceType.choices,
    )

    event_type = models.CharField(max_length=150)

    event_date = models.DateField()

    event_location = models.TextField()

    estimated_guest_count = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    customer_budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    requirements = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )

    # The price the owner quoted the customer after negotiating.
    quoted_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    # Private notes for the business owner. Never shown to customers.
    internal_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event_date", "-created_at"]

    def __str__(self):
        return f"{self.customer_name} - {self.event_type}"


class CateringBooking(models.Model):

    class Status(models.TextChoices):
        CONFIRMED = "CONFIRMED", "Confirmed"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    inquiry = models.OneToOneField(
        CateringInquiry,
        on_delete=models.PROTECT,
        related_name="booking",
    )

    agreed_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    deposit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    @property
    def outstanding_balance(self):
        return self.agreed_amount - self.deposit_amount

    def __str__(self):
        return f"Booking for {self.inquiry.customer_name}"