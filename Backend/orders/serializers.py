from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from dashboard.models import SiteSettings
from dashboard.notifications import notify_new_order

from .models import Order, OrderItem, Payment
from .services import (
    aggregate_quantities,
    allowed_next_statuses,
    reserve_stock,
)


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=500)


class OrderItemReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "line_total"]


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.username", read_only=True, default="")
    order_id = serializers.IntegerField(read_only=True)
    customer_name = serializers.CharField(source="order.customer_name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "customer_name",
            "kind",
            "amount",
            "method",
            "reference",
            "note",
            "recorded_by_name",
            "created_at",
        ]
        read_only_fields = fields


class PaymentInputSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=Payment.Kind.choices, default=Payment.Kind.PAYMENT)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    method = serializers.ChoiceField(choices=Payment.Method.choices, default=Payment.Method.CASH)
    reference = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class OrderListSerializer(serializers.ModelSerializer):
    """Full order detail for the administrator."""

    items = OrderItemReadSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    amount_refunded = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    allowed_next_statuses = serializers.SerializerMethodField()
    fulfillment_date = serializers.DateField(read_only=True)
    fulfillment_time = serializers.TimeField(read_only=True)
    is_advance_order = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer_name",
            "customer_phone",
            "customer_email",
            "fulfillment_method",
            "delivery_address",
            "delivery_notes",
            "requested_pickup_date",
            "requested_pickup_time",
            "requested_delivery_date",
            "requested_delivery_time",
            "fulfillment_date",
            "fulfillment_time",
            "is_advance_order",
            "status",
            "allowed_next_statuses",
            "payment_status",
            "subtotal",
            "delivery_fee",
            "total_amount",
            "amount_paid",
            "amount_refunded",
            "balance_due",
            "customer_notes",
            "items",
            "payments",
            "created_at",
            "updated_at",
        ]

    def get_allowed_next_statuses(self, obj):
        return allowed_next_statuses(obj)

    def get_is_advance_order(self, obj):
        date = obj.fulfillment_date
        if not date:
            return False
        return date > timezone.localdate(obj.created_at)


class OrderTrackSerializer(serializers.ModelSerializer):
    """What a customer may see about their own order (no contact details)."""

    items = OrderItemReadSerializer(many=True, read_only=True)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    fulfillment_date = serializers.DateField(read_only=True)
    fulfillment_time = serializers.TimeField(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_number",
            "customer_name",
            "fulfillment_method",
            "delivery_address",
            "fulfillment_date",
            "fulfillment_time",
            "status",
            "status_label",
            "payment_status",
            "subtotal",
            "delivery_fee",
            "total_amount",
            "amount_paid",
            "balance_due",
            "customer_notes",
            "items",
            "created_at",
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "customer_name",
            "customer_phone",
            "customer_email",
            "fulfillment_method",
            "delivery_address",
            "delivery_notes",
            "requested_pickup_date",
            "requested_pickup_time",
            "requested_delivery_date",
            "requested_delivery_time",
            "customer_notes",
            "items",
        ]
        read_only_fields = ["id"]

    def validate_customer_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Please enter your name.")
        return value

    def validate_customer_phone(self, value):
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) < 7 or len(digits) > 15:
            raise serializers.ValidationError("Please enter a valid phone number.")
        return value.strip()

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("An order must contain at least one product.")
        return value

    def validate(self, attrs):
        site = SiteSettings.load()
        if not site.accepts_orders:
            raise serializers.ValidationError(
                "We are not taking online orders right now. Please contact us on WhatsApp."
            )

        method = attrs.get("fulfillment_method", Order.FulfillmentMethod.PICKUP)
        today = timezone.localdate()

        if method == Order.FulfillmentMethod.DELIVERY:
            if not site.delivery_enabled:
                raise serializers.ValidationError({"fulfillment_method": "Delivery is not available right now."})
            if not attrs.get("delivery_address", "").strip():
                raise serializers.ValidationError({"delivery_address": "A delivery address is required."})
            date_field, time_field = "requested_delivery_date", "requested_delivery_time"
            attrs["requested_pickup_date"] = None
            attrs["requested_pickup_time"] = None
        else:
            attrs["delivery_address"] = ""
            attrs["delivery_notes"] = ""
            date_field, time_field = "requested_pickup_date", "requested_pickup_time"
            attrs["requested_delivery_date"] = None
            attrs["requested_delivery_time"] = None

        date = attrs.get(date_field) or today
        time = attrs.get(time_field)
        attrs[date_field] = date

        if date < today:
            raise serializers.ValidationError({date_field: "The date cannot be in the past."})
        if (date - today).days > site.max_advance_days:
            raise serializers.ValidationError(
                {date_field: f"Orders can only be booked up to {site.max_advance_days} days ahead."}
            )
        if time and date == today and time < timezone.localtime().time():
            raise serializers.ValidationError({time_field: "That time has already passed today."})

        attrs["_fulfilment_date"] = date
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        fulfilment_date = validated_data.pop("_fulfilment_date")
        today = timezone.localdate()
        site = SiteSettings.load()

        quantities = aggregate_quantities(items_data)
        reserved = reserve_stock(quantities, fulfilment_date, today)

        # Build one order line per product, using the price right now.
        subtotal = Decimal("0.00")
        lines = []
        for product_id, quantity in quantities.items():
            product, availability = reserved[product_id]
            line_total = product.price * quantity
            subtotal += line_total
            lines.append(
                dict(
                    product=product,
                    availability=availability,
                    product_name=product.name,
                    quantity=quantity,
                    unit_price=product.price,
                    line_total=line_total,
                )
            )

        delivery_fee = Decimal("0.00")
        if validated_data.get("fulfillment_method") == Order.FulfillmentMethod.DELIVERY:
            delivery_fee = site.delivery_fee
            threshold = site.free_delivery_threshold
            if threshold is not None and subtotal >= threshold:
                delivery_fee = Decimal("0.00")

        order = Order.objects.create(
            **validated_data,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total_amount=subtotal + delivery_fee,
        )
        OrderItem.objects.bulk_create([OrderItem(order=order, **line) for line in lines])
        transaction.on_commit(lambda: notify_new_order(order.pk))
        return order


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
