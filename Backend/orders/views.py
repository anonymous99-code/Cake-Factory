from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Order, Payment
from .serializers import (
    OrderCreateSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
    OrderTrackSerializer,
    PaymentInputSerializer,
    PaymentSerializer,
)
from .services import change_order_status, record_payment


def orders_queryset():
    return Order.objects.prefetch_related("items", "payments", "payments__recorded_by")


class OrderCreateAPIView(generics.CreateAPIView):
    """Customers place orders without an account."""

    queryset = Order.objects.all()
    serializer_class = OrderCreateSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "orders"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        order = orders_queryset().get(pk=order.pk)
        return Response(OrderTrackSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderTrackAPIView(APIView):
    """Lets a customer look up their own order using its private order number."""

    permission_classes = [AllowAny]

    def get(self, request, order_number):
        order = get_object_or_404(orders_queryset(), order_number=order_number)
        return Response(OrderTrackSerializer(order).data)


class OrderListAPIView(generics.ListAPIView):
    """Administrators: list orders. Filters: status, payment_status, date, q."""

    serializer_class = OrderListSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = orders_queryset()
        params = self.request.query_params

        if params.get("status"):
            qs = qs.filter(status=params["status"].upper())
        if params.get("payment_status"):
            qs = qs.filter(payment_status=params["payment_status"].upper())
        if params.get("date"):
            qs = qs.filter(
                Q(requested_pickup_date=params["date"]) | Q(requested_delivery_date=params["date"])
            )
        if params.get("q"):
            term = params["q"].strip()
            qs = qs.filter(
                Q(customer_name__icontains=term)
                | Q(customer_phone__icontains=term)
                | Q(order_number__icontains=term)
            )
        return qs


class OrderDetailAPIView(generics.RetrieveAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [IsAdminUser]
    queryset = orders_queryset()


class OrderStatusUpdateAPIView(APIView):
    """Administrators: move an order to its next status (validated)."""

    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        get_object_or_404(Order, pk=pk)
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        change_order_status(pk, serializer.validated_data["status"])
        order = orders_queryset().get(pk=pk)
        return Response(OrderListSerializer(order).data)

    put = patch


class OrderPaymentCreateAPIView(APIView):
    """Administrators: record a payment received or a refund paid."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        get_object_or_404(Order, pk=pk)
        serializer = PaymentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record_payment(pk, user=request.user, **serializer.validated_data)
        order = orders_queryset().get(pk=pk)
        return Response(OrderListSerializer(order).data, status=status.HTTP_201_CREATED)


class PaymentListAPIView(generics.ListAPIView):
    """Administrators: every payment and refund, newest first."""

    serializer_class = PaymentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Payment.objects.select_related("order", "recorded_by")
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind.upper())
        return qs[:500]
