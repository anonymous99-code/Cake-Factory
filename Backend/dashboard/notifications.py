"""
Email notifications.

Emails are best-effort: if sending fails (wrong password, no internet) the
problem is logged and the order or inquiry is still saved normally.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import SiteSettings

logger = logging.getLogger(__name__)

CUSTOMER_STATUS_MESSAGES = {
    "CONFIRMED": "Good news, your order is confirmed. We will start preparing it soon.",
    "READY": "Your order is ready.",
    "OUT_FOR_DELIVERY": "Your order is on its way to you.",
    "COMPLETED": "Your order is complete. Thank you for choosing us!",
    "CANCELLED": "Your order has been cancelled. Please contact us if this is a surprise.",
}


def _naira(value):
    return f"₦{float(value):,.0f}"


def _send(subject, body, recipients):
    recipients = list(dict.fromkeys(r for r in recipients if r))
    if not recipients:
        return
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=False)
    except Exception:  # noqa: BLE001 - never let an email problem break an order
        logger.exception("Could not send email %r", subject)


def _owner_recipients():
    return [SiteSettings.load().notify_email, *settings.OWNER_NOTIFY_EMAILS]


def notify_new_order(order_id):
    from orders.models import Order

    order = Order.objects.prefetch_related("items").get(pk=order_id)
    site = SiteSettings.load()
    ref = str(order.order_number)[:8].upper()
    lines = "\n".join(f"  {i.quantity} x {i.product_name}  ({_naira(i.line_total)})" for i in order.items.all())
    when = f"{order.fulfillment_date:%A %d %B %Y}" + (f" at {order.fulfillment_time:%I:%M %p}" if order.fulfillment_time else "")
    method = "DELIVERY" if order.fulfillment_method == "DELIVERY" else "PICKUP"

    body = (
        f"You have a new order on {site.business_name}.\n\n"
        f"Order: #{ref}\n"
        f"Customer: {order.customer_name}\n"
        f"Phone: {order.customer_phone}\n"
        f"{method}: {when}\n"
        + (f"Address: {order.delivery_address}\n" if order.delivery_address else "")
        + f"\nItems:\n{lines}\n\n"
        f"Total: {_naira(order.total_amount)}\n"
        + (f"Customer note: {order.customer_notes}\n" if order.customer_notes else "")
        + f"\nOpen it here: {settings.FRONTEND_URL}/admin/orders\n"
    )
    _send(f"New order #{ref} from {order.customer_name} ({_naira(order.total_amount)})", body, _owner_recipients())

    if order.customer_email:
        track = f"{settings.FRONTEND_URL}/order/{order.order_number}"
        _send(
            f"We received your order #{ref}",
            f"Hello {order.customer_name},\n\nThank you for your order with {site.business_name}. "
            f"We will confirm it shortly.\n\nOrder: #{ref}\nTotal: {_naira(order.total_amount)}\n"
            f"{method.title()}: {when}\n\nFollow your order here: {track}\n",
            [order.customer_email],
        )


def notify_order_status(order_id, new_status):
    from orders.models import Order

    message = CUSTOMER_STATUS_MESSAGES.get(new_status)
    if not message:
        return
    order = Order.objects.get(pk=order_id)
    if not order.customer_email:
        return
    site = SiteSettings.load()
    ref = str(order.order_number)[:8].upper()
    track = f"{settings.FRONTEND_URL}/order/{order.order_number}"
    _send(
        f"Your {site.business_name} order #{ref}: {new_status.replace('_', ' ').title()}",
        f"Hello {order.customer_name},\n\n{message}\n\nOrder: #{ref}\nSee details: {track}\n",
        [order.customer_email],
    )


def notify_new_inquiry(inquiry_id):
    from catering.models import CateringInquiry

    inquiry = CateringInquiry.objects.get(pk=inquiry_id)
    site = SiteSettings.load()
    body = (
        f"New {inquiry.get_service_type_display().lower()} inquiry on {site.business_name}.\n\n"
        f"Customer: {inquiry.customer_name}\n"
        f"Phone: {inquiry.customer_phone}\n"
        + (f"Email: {inquiry.customer_email}\n" if inquiry.customer_email else "")
        + f"Event: {inquiry.event_type} on {inquiry.event_date:%A %d %B %Y}\n"
        f"Location: {inquiry.event_location}\n"
        + (f"Guests: {inquiry.estimated_guest_count}\n" if inquiry.estimated_guest_count else "")
        + (f"Budget: {_naira(inquiry.customer_budget)}\n" if inquiry.customer_budget else "")
        + (f"\nRequirements:\n{inquiry.requirements}\n" if inquiry.requirements else "")
        + f"\nOpen it here: {settings.FRONTEND_URL}/admin/catering\n"
    )
    _send(f"New inquiry: {inquiry.event_type} from {inquiry.customer_name}", body, _owner_recipients())