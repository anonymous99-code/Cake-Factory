from django.urls import path

from .views import (
    AvailabilityManageDetailAPIView,
    AvailabilityManageListCreateAPIView,
    PublicAvailabilityListAPIView,
)

urlpatterns = [
    path("", PublicAvailabilityListAPIView.as_view(), name="availability-public"),
    path("manage/", AvailabilityManageListCreateAPIView.as_view(), name="availability-manage"),
    path("manage/<int:pk>/", AvailabilityManageDetailAPIView.as_view(), name="availability-manage-detail"),
]
