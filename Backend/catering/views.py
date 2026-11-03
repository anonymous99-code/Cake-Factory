from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import CateringBooking, CateringInquiry
from dashboard.notifications import notify_new_inquiry
from .serializers import (
    ALLOWED_TRANSITIONS,
    CateringBookingSerializer,
    CateringInquiryCreateSerializer,
    CateringInquirySerializer,
    InquiryAcceptSerializer,
    InquiryStatusSerializer,
)
from rest_framework import serializers


class InquiryCreateAPIView(generics.CreateAPIView):
    """Public: customers submit catering and event-planning inquiries."""

    queryset = CateringInquiry.objects.all()
    serializer_class = CateringInquiryCreateSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "inquiries"

    
    def perform_create(self, serializer):
        inquiry = serializer.save()
        transaction.on_commit(lambda: notify_new_inquiry(inquiry.pk))


class InquiryListAPIView(generics.ListAPIView):
    """Administrators. Filters: status, service_type (comma separated), q."""

    serializer_class = CateringInquirySerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = CateringInquiry.objects.select_related("booking")
        params = self.request.query_params
        if params.get("status"):
            qs = qs.filter(status=params["status"].upper())
        if params.get("service_type"):
            types = [t.strip().upper() for t in params["service_type"].split(",") if t.strip()]
            qs = qs.filter(service_type__in=types)
        if params.get("q"):
            term = params["q"].strip()
            qs = qs.filter(
                Q(customer_name__icontains=term)
                | Q(customer_phone__icontains=term)
                | Q(event_type__icontains=term)
            )
        return qs.order_by("-created_at")


class InquiryDetailAPIView(generics.RetrieveUpdateAPIView):
    """Administrators: view an inquiry, edit the quotation and private notes."""

    serializer_class = CateringInquirySerializer
    permission_classes = [IsAdminUser]
    queryset = CateringInquiry.objects.select_related("booking")
    http_method_names = ["get", "patch", "head", "options"]


class InquiryStatusAPIView(APIView):
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def patch(self, request, pk):
        inquiry = get_object_or_404(CateringInquiry.objects.select_for_update(), pk=pk)
        serializer = InquiryStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        if new_status == CateringInquiry.Status.ACCEPTED:
            raise serializers.ValidationError(
                {"status": "Use the Accept action so the booking is created with the agreed price."}
            )
        if new_status not in ALLOWED_TRANSITIONS.get(inquiry.status, set()):
            raise serializers.ValidationError(
                {"status": f"An inquiry that is '{inquiry.get_status_display()}' cannot be changed to that status."}
            )

        if new_status == CateringInquiry.Status.QUOTATION_SENT:
            quote = serializer.validated_data.get("quoted_amount") or inquiry.quoted_amount
            if not quote or quote <= 0:
                raise serializers.ValidationError(
                    {"quoted_amount": "Enter the quoted amount before marking the quotation as sent."}
                )
            inquiry.quoted_amount = quote

        inquiry.status = new_status
        inquiry.save()
        inquiry = CateringInquiry.objects.select_related("booking").get(pk=pk)
        return Response(CateringInquirySerializer(inquiry).data)


class InquiryAcceptAPIView(APIView):
    """The customer accepted the quotation: create the confirmed booking."""

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request, pk):
        inquiry = get_object_or_404(CateringInquiry.objects.select_for_update(), pk=pk)
        if inquiry.status != CateringInquiry.Status.QUOTATION_SENT:
            raise serializers.ValidationError(
                {"status": "Only an inquiry with a sent quotation can be accepted."}
            )

        data = InquiryAcceptSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        agreed = data.validated_data.get("agreed_amount") or inquiry.quoted_amount

        booking_serializer = CateringBookingSerializer(
            data={
                "agreed_amount": agreed,
                "deposit_amount": data.validated_data["deposit_amount"],
                "notes": data.validated_data["notes"],
            }
        )
        booking_serializer.is_valid(raise_exception=True)
        booking_serializer.save(inquiry=inquiry)

        inquiry.status = CateringInquiry.Status.ACCEPTED
        inquiry.quoted_amount = agreed
        inquiry.save()

        inquiry = CateringInquiry.objects.select_related("booking").get(pk=pk)
        return Response(CateringInquirySerializer(inquiry).data, status=status.HTTP_201_CREATED)


class BookingListAPIView(generics.ListAPIView):
    serializer_class = CateringBookingSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = CateringBooking.objects.select_related("inquiry").order_by("inquiry__event_date")
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params["status"].upper())
        return qs


class BookingDetailAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = CateringBookingSerializer
    permission_classes = [IsAdminUser]
    queryset = CateringBooking.objects.select_related("inquiry")
    http_method_names = ["get", "patch", "head", "options"]
