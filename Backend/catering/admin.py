from django.contrib import admin

from .models import CateringInquiry, CateringBooking


@admin.register(CateringInquiry)
class CateringInquiryAdmin(admin.ModelAdmin):
    list_display = (
        "customer_name",
        "service_type",
        "event_type",
        "event_date",
        "status",
    )

    list_filter = ("service_type", "status")
    search_fields = ("customer_name", "customer_phone")


@admin.register(CateringBooking)
class CateringBookingAdmin(admin.ModelAdmin):
    list_display = (
        "inquiry",
        "agreed_amount",
        "deposit_amount",
        "status",
    )

    list_filter = ("status",)