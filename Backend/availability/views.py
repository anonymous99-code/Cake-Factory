from django.db.models import ProtectedError
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .models import ProductAvailability
from .serializers import ProductAvailabilitySerializer


class PublicAvailabilityListAPIView(generics.ListAPIView):
    """Upcoming scheduled stock customers can book. Filters: date, product."""

    serializer_class = ProductAvailabilitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = ProductAvailability.objects.select_related("product").filter(
            product__is_active=True,
            product__is_available=True,
            date__gte=timezone.localdate(),
        ).exclude(status=ProductAvailability.Status.UNAVAILABLE)

        params = self.request.query_params
        if params.get("date"):
            qs = qs.filter(date=params["date"])
        if params.get("product"):
            qs = qs.filter(product_id=params["product"])
        return qs


class AvailabilityManageListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProductAvailabilitySerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = ProductAvailability.objects.select_related("product")
        params = self.request.query_params
        if params.get("date"):
            qs = qs.filter(date=params["date"])
        if params.get("from"):
            qs = qs.filter(date__gte=params["from"])
        if params.get("product"):
            qs = qs.filter(product_id=params["product"])
        return qs


class AvailabilityManageDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductAvailabilitySerializer
    permission_classes = [IsAdminUser]
    queryset = ProductAvailability.objects.select_related("product")

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Orders already reserved stock on this date. Mark it Unavailable instead of deleting it."},
                status=status.HTTP_400_BAD_REQUEST,
            )
