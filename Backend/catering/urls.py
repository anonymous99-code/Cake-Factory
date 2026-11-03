from django.urls import path

from .views import (
    BookingDetailAPIView,
    BookingListAPIView,
    InquiryAcceptAPIView,
    InquiryCreateAPIView,
    InquiryDetailAPIView,
    InquiryListAPIView,
    InquiryStatusAPIView,
)

urlpatterns = [
    path("inquiries/", InquiryCreateAPIView.as_view(), name="inquiry-create"),
    path("inquiries/all/", InquiryListAPIView.as_view(), name="inquiry-list"),
    path("inquiries/<int:pk>/", InquiryDetailAPIView.as_view(), name="inquiry-detail"),
    path("inquiries/<int:pk>/status/", InquiryStatusAPIView.as_view(), name="inquiry-status"),
    path("inquiries/<int:pk>/accept/", InquiryAcceptAPIView.as_view(), name="inquiry-accept"),
    path("bookings/", BookingListAPIView.as_view(), name="booking-list"),
    path("bookings/<int:pk>/", BookingDetailAPIView.as_view(), name="booking-detail"),
]
