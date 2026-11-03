from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import CateringBooking, CateringInquiry

# Inquiry workflow: NEW -> CONTACTED -> QUOTATION_SENT -> ACCEPTED or DECLINED.
# ACCEPTED is only reached through the "accept" action, which creates the booking.
ALLOWED_TRANSITIONS = {
    CateringInquiry.Status.NEW: {CateringInquiry.Status.CONTACTED, CateringInquiry.Status.DECLINED},
    CateringInquiry.Status.CONTACTED: {
        CateringInquiry.Status.QUOTATION_SENT,
        CateringInquiry.Status.DECLINED,
    },
    CateringInquiry.Status.QUOTATION_SENT: {
        CateringInquiry.Status.CONTACTED,
        CateringInquiry.Status.DECLINED,
    },
    CateringInquiry.Status.ACCEPTED: set(),
    CateringInquiry.Status.DECLINED: {CateringInquiry.Status.CONTACTED},
}


class CateringBookingSerializer(serializers.ModelSerializer):
    outstanding_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    customer_name = serializers.CharField(source="inquiry.customer_name", read_only=True)
    customer_phone = serializers.CharField(source="inquiry.customer_phone", read_only=True)
    event_type = serializers.CharField(source="inquiry.event_type", read_only=True)
    event_date = serializers.DateField(source="inquiry.event_date", read_only=True)
    service_type = serializers.CharField(source="inquiry.service_type", read_only=True)

    class Meta:
        model = CateringBooking
        fields = [
            "id",
            "inquiry",
            "customer_name",
            "customer_phone",
            "service_type",
            "event_type",
            "event_date",
            "agreed_amount",
            "deposit_amount",
            "outstanding_balance",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "inquiry", "created_at", "updated_at"]

    def validate(self, attrs):
        agreed = attrs.get("agreed_amount", getattr(self.instance, "agreed_amount", None))
        deposit = attrs.get("deposit_amount", getattr(self.instance, "deposit_amount", Decimal("0")))
        if agreed is not None and agreed <= 0:
            raise serializers.ValidationError({"agreed_amount": "Agreed amount must be greater than zero."})
        if deposit is not None and deposit < 0:
            raise serializers.ValidationError({"deposit_amount": "Deposit cannot be negative."})
        if agreed is not None and deposit is not None and deposit > agreed:
            raise serializers.ValidationError({"deposit_amount": "Deposit cannot be more than the agreed amount."})
        return attrs


class CateringInquiryCreateSerializer(serializers.ModelSerializer):
    """Public form."""

    class Meta:
        model = CateringInquiry
        fields = [
            "id",
            "service_type",
            "customer_name",
            "customer_phone",
            "customer_email",
            "event_type",
            "event_date",
            "event_location",
            "estimated_guest_count",
            "customer_budget",
            "requirements",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "requirements": {"required": False, "allow_blank": True},
            "customer_email": {"required": False, "allow_blank": True},
        }

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

    def validate_event_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("The event date cannot be in the past.")
        return value

    def validate_estimated_guest_count(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError("Guest count must be at least 1.")
        return value

    def validate_customer_budget(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Budget must be greater than zero.")
        return value


class CateringInquirySerializer(serializers.ModelSerializer):
    """Administrator view of an inquiry."""

    booking = CateringBookingSerializer(read_only=True)
    allowed_next_statuses = serializers.SerializerMethodField()

    class Meta:
        model = CateringInquiry
        fields = [
            "id",
            "service_type",
            "customer_name",
            "customer_phone",
            "customer_email",
            "event_type",
            "event_date",
            "event_location",
            "estimated_guest_count",
            "customer_budget",
            "requirements",
            "status",
            "allowed_next_statuses",
            "quoted_amount",
            "internal_notes",
            "booking",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "service_type",
            "customer_name",
            "customer_phone",
            "customer_email",
            "event_type",
            "event_date",
            "event_location",
            "estimated_guest_count",
            "customer_budget",
            "requirements",
            "status",
            "booking",
            "created_at",
            "updated_at",
        ]

    def get_allowed_next_statuses(self, obj):
        return sorted(ALLOWED_TRANSITIONS.get(obj.status, set()))

    def validate_quoted_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("The quotation must be greater than zero.")
        return value


class InquiryStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=CateringInquiry.Status.choices)
    quoted_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class InquiryAcceptSerializer(serializers.Serializer):
    agreed_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    deposit_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0"))
    notes = serializers.CharField(required=False, allow_blank=True, default="")
