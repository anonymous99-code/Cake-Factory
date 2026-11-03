from django.contrib import admin

from .models import ProductAvailability


@admin.register(ProductAvailability)
class ProductAvailabilityAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "date",
        "expected_ready_time",
        "available_quantity",
        "status",
    )

    list_filter = ("date", "status")
    search_fields = ("product__name",)