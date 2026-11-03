from rest_framework import serializers

from .models import Expense, SiteSettings

PUBLIC_FIELDS = [
    "business_name",
    "tagline",
    "whatsapp_number",
    "phone_number",
    "email",
    "address",
    "google_maps_url",
    "opening_hours",
    "about_text",
    "accepts_orders",
    "delivery_enabled",
    "delivery_fee",
    "free_delivery_threshold",
    "delivery_policy",
    "max_advance_days",
]


class PublicSiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = PUBLIC_FIELDS
        read_only_fields = PUBLIC_FIELDS


class AdminSiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = PUBLIC_FIELDS + ["notify_email", "low_stock_threshold", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate_whatsapp_number(self, value):
        digits = "".join(ch for ch in value if ch.isdigit())
        if value and len(digits) < 10:
            raise serializers.ValidationError("Enter the full number with country code, e.g. 2348012345678.")
        return digits

    def validate_delivery_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Delivery fee cannot be negative.")
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ["id", "date", "category", "description", "amount", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value
