from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import MeAPIView, ThrottledTokenObtainPairView
from dashboard.views import PublicSettingsAPIView

admin.site.site_header = "Cake Factory administration"
admin.site.site_title = "Cake Factory"

urlpatterns = [
    path("admin/", admin.site.urls),
    # Authentication
    path("api/auth/token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeAPIView.as_view(), name="auth-me"),
    # Public business details (WhatsApp number, delivery fee, ...)
    path("api/settings/", PublicSettingsAPIView.as_view(), name="public-settings"),
    # Apps
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/availability/", include("availability.urls")),
    path("api/catering/", include("catering.urls")),
    path("api/dashboard/", include("dashboard.urls")),
]

# Uploaded product photos. In production, serve media from persistent storage.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
