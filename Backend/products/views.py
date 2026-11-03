from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAdminUser

from .models import Product
from .serializers import ProductSerializer


def visible_products(request):
    """Customers see active, available products. Staff see everything."""
    if request.user and request.user.is_staff:
        return Product.objects.all()
    return Product.objects.filter(is_active=True, is_available=True)


class ProductListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = visible_products(self.request)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category.upper())

        search = self.request.query_params.get("q")
        if search:
            queryset = queryset.filter(name__icontains=search.strip())

        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminUser()]
        return [AllowAny()]


class ProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminUser()]
        return [AllowAny()]

    def get_queryset(self):
        return visible_products(self.request)

    def perform_destroy(self, instance):
        # Products that appear on past orders can never be erased, so
        # "delete" hides the product from the shop and keeps the history.
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
