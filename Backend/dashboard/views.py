from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, Max, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from catering.models import CateringBooking, CateringInquiry
from orders.models import Order, Payment
from orders.serializers import OrderListSerializer
from products.models import Product

from .models import Expense, SiteSettings
from .serializers import (
    AdminSiteSettingsSerializer,
    ExpenseSerializer,
    PublicSiteSettingsSerializer,
)

ZERO = Decimal("0.00")


def money(qs, field, **filters):
    value = qs.filter(**filters).aggregate(total=Sum(field))["total"]
    return value or ZERO


def clamp_days(raw, default, maximum=365):
    try:
        return max(1, min(int(raw), maximum))
    except (TypeError, ValueError):
        return default


class PublicSettingsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(PublicSiteSettingsSerializer(SiteSettings.load()).data)


class AdminSettingsAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminSiteSettingsSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return SiteSettings.load()


class DashboardSummaryAPIView(APIView):
    """
    Business numbers, all calculated from real records.

    Order value, money received, refunds, outstanding balances and expenses
    are kept separate on purpose: revenue is not profit.
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        days = clamp_days(request.query_params.get("days"), 30)
        now = timezone.now()
        since = now - timedelta(days=days)
        today = timezone.localdate()
        site = SiteSettings.load()

        # ---- Orders -------------------------------------------------------
        by_status = {s: 0 for s, _ in Order.Status.choices}
        for row in Order.objects.values("status").annotate(n=Count("id")):
            by_status[row["status"]] = row["n"]

        active_orders = Order.objects.exclude(status=Order.Status.CANCELLED)
        due_today = active_orders.exclude(status=Order.Status.COMPLETED).filter(
            Q(requested_pickup_date=today) | Q(requested_delivery_date=today)
        ).count()

        orders = {
            "total": sum(by_status.values()),
            "by_status": by_status,
            "pending": by_status["PENDING"],
            "confirmed": by_status["CONFIRMED"],
            "preparing": by_status["PREPARING"],
            "completed": by_status["COMPLETED"],
            "received_today": Order.objects.filter(created_at__date=today).count(),
            "due_today": due_today,
        }

        # ---- Money --------------------------------------------------------
        decimal_zero = Value(ZERO, output_field=DecimalField(max_digits=14, decimal_places=2))
        paid_expr = Coalesce(
            Sum("payments__amount", filter=Q(payments__kind=Payment.Kind.PAYMENT)), decimal_zero
        )
        refunded_expr = Coalesce(
            Sum("payments__amount", filter=Q(payments__kind=Payment.Kind.REFUND)), decimal_zero
        )
        outstanding = ZERO
        for row in active_orders.annotate(paid=paid_expr, refunded=refunded_expr).values(
            "total_amount", "paid", "refunded"
        ):
            balance = row["total_amount"] - (row["paid"] - row["refunded"])
            if balance > 0:
                outstanding += balance

        period_payments = Payment.objects.filter(created_at__gte=since)
        received = money(period_payments, "amount", kind=Payment.Kind.PAYMENT)
        refunds = money(period_payments, "amount", kind=Payment.Kind.REFUND)
        expenses = money(Expense.objects.all(), "amount", date__gte=timezone.localdate(since))
        order_value = money(active_orders, "total_amount", created_at__gte=since)

        bookings = CateringBooking.objects.exclude(status=CateringBooking.Status.CANCELLED)
        booked_value = money(bookings, "agreed_amount")
        booking_received = money(bookings, "deposit_amount")

        money_block = {
            "period_days": days,
            "order_value": order_value,
            "amount_received": received,
            "refunds": refunds,
            "net_received": received - refunds,
            "outstanding_orders": outstanding,
            "expenses": expenses,
            # Orders only, and only as good as the expenses that were entered.
            "estimated_profit": received - refunds - expenses,
            "catering_booked_value": booked_value,
            "catering_received": booking_received,
            "catering_outstanding": booked_value - booking_received,
        }

        # ---- Products -----------------------------------------------------
        live = Product.objects.filter(is_active=True, is_available=True)
        low_stock = live.filter(available_quantity__lte=site.low_stock_threshold).order_by(
            "available_quantity", "name"
        )
        products = {
            "available": live.filter(available_quantity__gt=0).count(),
            "sold_out": live.filter(available_quantity=0).count(),
            "low_stock_threshold": site.low_stock_threshold,
            "low_stock": [
                {"id": p.id, "name": p.name, "available_quantity": p.available_quantity}
                for p in low_stock[:10]
            ],
        }

        # ---- Catering -----------------------------------------------------
        inquiry_counts = {s: 0 for s, _ in CateringInquiry.Status.choices}
        for row in CateringInquiry.objects.values("status").annotate(n=Count("id")):
            inquiry_counts[row["status"]] = row["n"]

        upcoming = (
            bookings.exclude(status=CateringBooking.Status.COMPLETED)
            .filter(inquiry__event_date__gte=today)
            .select_related("inquiry")
            .order_by("inquiry__event_date")[:5]
        )
        catering = {
            "inquiries_by_status": inquiry_counts,
            "new_inquiries": inquiry_counts["NEW"],
                        "new_catering_inquiries": CateringInquiry.objects.filter(
                status="NEW", service_type__in=["CATERING", "BOTH"]
            ).count(),
            "new_event_inquiries": CateringInquiry.objects.filter(
                status="NEW", service_type__in=["EVENT_PLANNING", "BOTH"]
            ).count(),
            "open_inquiries": inquiry_counts["NEW"] + inquiry_counts["CONTACTED"] + inquiry_counts["QUOTATION_SENT"],
            "confirmed_bookings": bookings.count(),
            "upcoming_bookings": [
                {
                    "id": b.id,
                    "customer_name": b.inquiry.customer_name,
                    "event_type": b.inquiry.event_type,
                    "event_date": b.inquiry.event_date,
                    "agreed_amount": b.agreed_amount,
                    "outstanding_balance": b.outstanding_balance,
                }
                for b in upcoming
            ],
        }

        recent = Order.objects.prefetch_related("items", "payments", "payments__recorded_by")[:6]

        return Response(
            {
                "orders": orders,
                "money": money_block,
                "products": products,
                "catering": catering,
                "recent_orders": OrderListSerializer(recent, many=True).data,
            }
        )


class RevenueSeriesAPIView(APIView):
    """Daily money received and order value, for the revenue chart."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        days = clamp_days(request.query_params.get("days"), 14, 90)
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)

        received, refunded, order_value, order_count = {}, {}, {}, {}

        for row in (
            Payment.objects.filter(created_at__date__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day", "kind")
            .annotate(total=Sum("amount"))
        ):
            target = received if row["kind"] == Payment.Kind.PAYMENT else refunded
            target[row["day"]] = row["total"]

        for row in (
            Order.objects.exclude(status=Order.Status.CANCELLED)
            .filter(created_at__date__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Sum("total_amount"), n=Count("id"))
        ):
            order_value[row["day"]] = row["total"]
            order_count[row["day"]] = row["n"]

        series = []
        for offset in range(days):
            day = start + timedelta(days=offset)
            series.append(
                {
                    "date": day,
                    "received": (received.get(day, ZERO) - refunded.get(day, ZERO)),
                    "order_value": order_value.get(day, ZERO),
                    "orders": order_count.get(day, 0),
                }
            )
        return Response(series)


class CustomerListAPIView(APIView):
    """Customers are built from their orders (no customer accounts are needed)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        latest_name = Order.objects.filter(customer_phone=OuterRef("customer_phone")).order_by(
            "-created_at"
        )
        rows = (
            Order.objects.values("customer_phone")
            .annotate(
                name=Subquery(latest_name.values("customer_name")[:1]),
                email=Subquery(latest_name.values("customer_email")[:1]),
                orders=Count("id", filter=~Q(status=Order.Status.CANCELLED)),
                cancelled=Count("id", filter=Q(status=Order.Status.CANCELLED)),
                total_spent=Coalesce(
                    Sum("total_amount", filter=~Q(status=Order.Status.CANCELLED)),
                    Value(ZERO, output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
                last_order=Max("created_at"),
            )
            .order_by("-last_order")
        )
        term = request.query_params.get("q", "").strip().lower()
        data = [
            {
                "phone": r["customer_phone"],
                "name": r["name"],
                "email": r["email"],
                "orders": r["orders"],
                "cancelled": r["cancelled"],
                "total_spent": r["total_spent"],
                "last_order": r["last_order"],
            }
            for r in rows
            if not term or term in (r["name"] or "").lower() or term in r["customer_phone"]
        ]
        return Response(data)


class ExpenseListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Expense.objects.all()
        params = self.request.query_params
        if params.get("from"):
            qs = qs.filter(date__gte=params["from"])
        if params.get("to"):
            qs = qs.filter(date__lte=params["to"])
        return qs


class ExpenseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdminUser]
    queryset = Expense.objects.all()
