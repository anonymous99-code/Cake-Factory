from rest_framework import serializers

from .models import Product

MAX_IMAGE_BYTES = 5 * 1024 * 1024


class ProductSerializer(serializers.ModelSerializer):
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "category",
            "price",
            "image",
            "available_quantity",
            "estimated_preparation_minutes",
            "is_available",
            "is_active",
            "in_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "in_stock", "created_at", "updated_at"]

        extra_kwargs = {
            "is_active": {"default": True},
            "is_available": {"default": True},
        }

    def get_in_stock(self, obj):
        return obj.is_available and obj.available_quantity > 0

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_image(self, value):
        if value and value.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError("Image must be 5 MB or smaller.")
        return value
