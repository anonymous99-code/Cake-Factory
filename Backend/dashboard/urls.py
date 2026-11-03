from django.urls import path

from .views import (
    AdminSettingsAPIView,
    CustomerListAPIView,
    DashboardSummaryAPIView,
    ExpenseDetailAPIView,
    ExpenseListCreateAPIView,
    RevenueSeriesAPIView,
)

urlpatterns = [
    path("summary/", DashboardSummaryAPIView.as_view(), name="dashboard-summary"),
    path("revenue/", RevenueSeriesAPIView.as_view(), name="dashboard-revenue"),
    path("customers/", CustomerListAPIView.as_view(), name="dashboard-customers"),
    path("settings/", AdminSettingsAPIView.as_view(), name="dashboard-settings"),
    path("expenses/", ExpenseListCreateAPIView.as_view(), name="expense-list"),
    path("expenses/<int:pk>/", ExpenseDetailAPIView.as_view(), name="expense-detail"),
]
