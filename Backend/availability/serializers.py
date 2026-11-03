from django.utils import timezone
from rest_framework import serializers

from .models import ProductAvailability


class ProductAvailabilitySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductAvailability
        fields = [
            "id",
            "product",
            "product_name",
            "date",
            "expected_ready_time",
            "available_quantity",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "product_name", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        product = attrs.get("product", getattr(instance, "product", None))
        date = attrs.get("date", getattr(instance, "date", None))

        if instance is None and date and date < timezone.localdate():
            raise serializers.ValidationError({"date": "The date cannot be in the past."})

        duplicates = ProductAvailability.objects.filter(product=product, date=date)
        if instance:
            duplicates = duplicates.exclude(pk=instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                "This product already has a schedule for that date. Edit that entry instead."
            )
        return attrs
