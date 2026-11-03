from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "price",
        "available_quantity",
        "is_available",
        "is_active",
    )

    list_filter = (
        "category",
        "is_available",
        "is_active",
    )

    search_fields = ("name",)