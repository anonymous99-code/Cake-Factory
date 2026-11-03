from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer_name",
        "total_amount",
        "status",
        "payment_status",
        "created_at",
    )

    list_filter = (
        "status",
        "payment_status",
        "fulfillment_method",
    )

    search_fields = (
        "customer_name",
        "customer_phone",
        "order_number",
    )

    inlines = [OrderItemInline]

from .models import Payment  # noqa: E402


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "kind", "amount", "method", "reference", "created_at")
    list_filter = ("kind", "method")
    search_fields = ("reference", "order__customer_name")
