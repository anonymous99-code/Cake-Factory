"""
Business rules for orders: stock reservation, cancellation and payments.

All functions here must be called inside a database transaction
(`transaction.atomic`) because they lock rows with select_for_update.
"""

from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from availability.models import ProductAvailability
from dashboard.notifications import notify_order_status
from products.models import Product

from .models import Order, OrderItem, Payment

# What an order is allowed to become next.
ALLOWED_TRANSITIONS = {
    Order.Status.PENDING: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PREPARING, Order.Status.CANCELLED},
    Order.Status.PREPARING: {Order.Status.READY, Order.Status.CANCELLED},
    Order.Status.READY: {
        Order.Status.OUT_FOR_DELIVERY,
        Order.Status.COMPLETED,
        Order.Status.CANCELLED,
    },
    Order.Status.OUT_FOR_DELIVERY: {Order.Status.COMPLETED, Order.Status.CANCELLED},
    Order.Status.COMPLETED: set(),
    Order.Status.CANCELLED: set(),
}


def allowed_next_statuses(order):
    """Statuses the owner may move this order to right now."""
    options = set(ALLOWED_TRANSITIONS.get(order.status, set()))
    if order.fulfillment_method == Order.FulfillmentMethod.PICKUP:
        options.discard(Order.Status.OUT_FOR_DELIVERY)
    else:
        # Delivery orders must go out for delivery before they are completed.
        if order.status == Order.Status.READY:
            options.discard(Order.Status.COMPLETED)
    return sorted(options)


# --------------------------------------------------------------------------
# Stock
# --------------------------------------------------------------------------
def aggregate_quantities(items_data):
    """Add up repeated product lines so 2 + 3 of the same product is 5."""
    totals = defaultdict(int)
    for item in items_data:
        totals[item["product_id"]] += item["quantity"]
    return dict(totals)


def reserve_stock(quantities, fulfilment_date, today):
    """
    Lock and deduct stock for {product_id: quantity}.

    Same-day orders come out of the product's daily stock.
    Future-dated (advance) orders come out of the scheduled availability for
    that date, so the same stock can never be sold twice for one day.

    Returns {product_id: (product, availability_or_None)}.
    """
    products = {
        product.id: product
        for product in Product.objects.select_for_update().filter(
            id__in=quantities.keys(), is_active=True, is_available=True
        )
    }

    schedules = {}
    if fulfilment_date > today:
        schedules = {
            row.product_id: row
            for row in ProductAvailability.objects.select_for_update().filter(
                product_id__in=quantities.keys(), date=fulfilment_date
            )
        }

    reserved = {}
    for product_id, quantity in quantities.items():
        product = products.get(product_id)
        if product is None:
            raise serializers.ValidationError(
                {"items": f"Product {product_id} is unavailable or does not exist."}
            )

        if fulfilment_date > today:
            row = schedules.get(product_id)
            if (
                row is None
                or row.status
                in (ProductAvailability.Status.UNAVAILABLE, ProductAvailability.Status.SOLD_OUT)
            ):
                raise serializers.ValidationError(
                    {
                        "items": (
                            f"'{product.name}' is not scheduled for {fulfilment_date:%d %b %Y}. "
                            "Please pick another date or contact us."
                        )
                    }
                )
            if quantity > row.available_quantity:
                raise serializers.ValidationError(
                    {
                        "items": (
                            f"Only {row.available_quantity} of '{product.name}' can be booked "
                            f"for {fulfilment_date:%d %b %Y}, but {quantity} were requested."
                        )
                    }
                )
            row.available_quantity -= quantity
            if row.available_quantity == 0:
                row.status = ProductAvailability.Status.SOLD_OUT
            row.save(update_fields=["available_quantity", "status", "updated_at"])
            reserved[product_id] = (product, row)
        else:
            if quantity > product.available_quantity:
                raise serializers.ValidationError(
                    {
                        "items": (
                            f"Only {product.available_quantity} unit(s) of '{product.name}' "
                            f"are available, but {quantity} were requested."
                        )
                    }
                )
            product.available_quantity -= quantity
            product.save(update_fields=["available_quantity", "updated_at"])
            reserved[product_id] = (product, None)

    return reserved


def restore_stock(order):
    """Give an order's reserved stock back, exactly once."""
    if order.stock_restored:
        return

    items = list(order.items.select_related("product", "availability"))
    for item in items:
        if item.availability_id:
            row = ProductAvailability.objects.select_for_update().get(pk=item.availability_id)
            row.available_quantity += item.quantity
            if row.status == ProductAvailability.Status.SOLD_OUT:
                row.status = ProductAvailability.Status.UPCOMING
            row.save(update_fields=["available_quantity", "status", "updated_at"])
        else:
            product = Product.objects.select_for_update().get(pk=item.product_id)
            product.available_quantity += item.quantity
            product.save(update_fields=["available_quantity", "updated_at"])

    order.stock_restored = True
    order.save(update_fields=["stock_restored", "updated_at"])


# --------------------------------------------------------------------------
# Status changes
# --------------------------------------------------------------------------
@transaction.atomic
def change_order_status(order_id, new_status):
    order = Order.objects.select_for_update().get(pk=order_id)

    if new_status == order.status:
        return order

    if new_status not in allowed_next_statuses(order):
        current = order.get_status_display()
        wanted = dict(Order.Status.choices).get(new_status, new_status)
        raise serializers.ValidationError(
            {"status": f"An order that is '{current}' cannot be changed to '{wanted}'."}
        )

    order.status = new_status
    order.save(update_fields=["status", "updated_at"])

    if new_status == Order.Status.CANCELLED:
       restore_stock(order)

    transaction.on_commit(lambda: notify_order_status(order.pk, new_status))
    return order


# --------------------------------------------------------------------------
# Payments
# --------------------------------------------------------------------------
def recompute_payment_status(order):
    paid, refunded = order._payment_totals()
    net = paid - refunded

    if refunded > 0 and net <= 0:
        status = Order.PaymentStatus.REFUNDED
    elif net >= order.total_amount and order.total_amount > 0:
        status = Order.PaymentStatus.PAID
    elif net > 0:
        status = Order.PaymentStatus.PARTIAL
    else:
        status = Order.PaymentStatus.UNPAID

    if status != order.payment_status:
        order.payment_status = status
        order.save(update_fields=["payment_status", "updated_at"])


@transaction.atomic
def record_payment(order_id, *, kind, amount, method, reference, note, user):
    order = Order.objects.select_for_update().get(pk=order_id)
    amount = Decimal(amount)

    if amount <= 0:
        raise serializers.ValidationError({"amount": "Amount must be greater than zero."})

    paid, refunded = order._payment_totals()
    net = paid - refunded

    if kind == Payment.Kind.PAYMENT:
        if order.status == Order.Status.CANCELLED:
            raise serializers.ValidationError(
                {"kind": "This order is cancelled. Record a refund instead of a payment."}
            )
        if net + amount > order.total_amount:
            raise serializers.ValidationError(
                {"amount": f"That is more than the balance due (₦{order.total_amount - net:,.2f})."}
            )
    else:
        if amount > net:
            raise serializers.ValidationError(
                {"amount": f"You can refund at most what was received (₦{net:,.2f})."}
            )

    if reference and Payment.objects.filter(reference=reference).exists():
        raise serializers.ValidationError(
            {"reference": "A payment with this reference has already been recorded."}
        )

    payment = Payment.objects.create(
        order=order,
        kind=kind,
        amount=amount,
        method=method,
        reference=reference,
        note=note,
        recorded_by=user if getattr(user, "is_authenticated", False) else None,
    )
    order = Order.objects.prefetch_related("payments").get(pk=order.pk)
    recompute_payment_status(order)
    return payment
