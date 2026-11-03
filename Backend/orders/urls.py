from django.urls import path

from .views import (
    OrderCreateAPIView,
    OrderDetailAPIView,
    OrderListAPIView,
    OrderPaymentCreateAPIView,
    OrderStatusUpdateAPIView,
    OrderTrackAPIView,
    PaymentListAPIView,
)

urlpatterns = [
    path("", OrderCreateAPIView.as_view(), name="order-create"),
    path("all/", OrderListAPIView.as_view(), name="order-list"),
    path("payments/", PaymentListAPIView.as_view(), name="payment-list"),
    path("track/<uuid:order_number>/", OrderTrackAPIView.as_view(), name="order-track"),
    path("<int:pk>/", OrderDetailAPIView.as_view(), name="order-detail"),
    path("<int:pk>/status/", OrderStatusUpdateAPIView.as_view(), name="order-status-update"),
    path("<int:pk>/payments/", OrderPaymentCreateAPIView.as_view(), name="order-payment-create"),
]
