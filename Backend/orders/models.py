import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class Order(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready for Pickup"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class FulfillmentMethod(models.TextChoices):
        PICKUP = "PICKUP", "Pickup"
        DELIVERY = "DELIVERY", "Delivery"

    class PaymentStatus(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PARTIAL = "PARTIAL", "Partially Paid"
        PAID = "PAID", "Paid"
        REFUNDED = "REFUNDED", "Refunded"

    order_number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    customer_name = models.CharField(max_length=150)

    customer_phone = models.CharField(max_length=20)

    customer_email = models.EmailField(blank=True)

    fulfillment_method = models.CharField(
        max_length=10,
        choices=FulfillmentMethod.choices,
        default=FulfillmentMethod.PICKUP,
    )

    delivery_address = models.TextField(blank=True)

    delivery_notes = models.TextField(blank=True)

    requested_pickup_date = models.DateField(
        null=True,
        blank=True,
    )

    requested_pickup_time = models.TimeField(
        null=True,
        blank=True,
    )

    requested_delivery_date = models.DateField(
        null=True,
        blank=True,
    )

    requested_delivery_time = models.TimeField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    payment_status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    delivery_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    customer_notes = models.TextField(blank=True)

    # True once reserved stock has been given back (cancellation). Prevents
    # the same stock being restored twice.
    stock_restored = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def fulfillment_date(self):
        if self.fulfillment_method == self.FulfillmentMethod.DELIVERY:
            return self.requested_delivery_date
        return self.requested_pickup_date

    @property
    def fulfillment_time(self):
        if self.fulfillment_method == self.FulfillmentMethod.DELIVERY:
            return self.requested_delivery_time
        return self.requested_pickup_time

    def _payment_totals(self):
        paid = Decimal("0.00")
        refunded = Decimal("0.00")
        for payment in self.payments.all():
            if payment.kind == Payment.Kind.REFUND:
                refunded += payment.amount
            else:
                paid += payment.amount
        return paid, refunded

    @property
    def amount_paid(self):
        """Money received minus money refunded."""
        paid, refunded = self._payment_totals()
        return paid - refunded

    @property
    def amount_refunded(self):
        return self._payment_totals()[1]

    @property
    def balance_due(self):
        if self.status == self.Status.CANCELLED:
            return Decimal("0.00")
        return max(self.total_amount - self.amount_paid, Decimal("0.00"))

    def __str__(self):
        return f"Order {self.order_number}"


class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name="items",
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    product_name = models.CharField(max_length=150)

    quantity = models.PositiveIntegerField()

    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    # Set when the stock was reserved from a scheduled (advance) availability
    # row instead of the product's daily stock.
    availability = models.ForeignKey(
        "availability.ProductAvailability",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="order_items",
    )

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"


class Payment(models.Model):
    """A money movement against an order: a payment received or a refund paid."""

    class Kind(models.TextChoices):
        PAYMENT = "PAYMENT", "Payment"
        REFUND = "REFUND", "Refund"

    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        TRANSFER = "TRANSFER", "Bank transfer"
        POS = "POS", "POS / Card"
        ONLINE = "ONLINE", "Online (gateway)"
        OTHER = "OTHER", "Other"

    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.PAYMENT)

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)

    # Bank transfer reference, gateway reference, receipt number...
    reference = models.CharField(max_length=120, blank=True)

    note = models.CharField(max_length=255, blank=True)

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_payments",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reference"],
                condition=~models.Q(reference=""),
                name="unique_payment_reference",
            ),
        ]

    def __str__(self):
        return f"{self.kind} {self.amount} for order {self.order_id}"