from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from orders.models import Order
from products.models import Product

User = get_user_model()


class DashboardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("owner", password="pw-for-tests-123", is_staff=True)
        self.pie = Product.objects.create(name="Meat Pie", price=Decimal("500"), available_quantity=3)

    def order(self, qty):
        res = self.client.post(
            "/api/orders/",
            {"customer_name": "Ada", "customer_phone": "08012345678", "items": [{"product_id": self.pie.id, "quantity": qty}]},
            format="json",
        )
        return Order.objects.get(order_number=res.data["order_number"])

    def test_requires_admin(self):
        self.assertEqual(self.client.get("/api/dashboard/summary/").status_code, 401)

    def test_numbers_come_from_real_records(self):
        o = self.order(2)  # 1000
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/orders/{o.id}/payments/", {"amount": "400", "method": "CASH"}, format="json")
        self.client.post("/api/dashboard/expenses/", {"date": "2026-01-01", "category": "OTHER", "description": "x", "amount": "100"}, format="json")

        res = self.client.get("/api/dashboard/summary/?days=3650")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["orders"]["pending"], 1)
        money = res.data["money"]
        self.assertEqual(Decimal(money["order_value"]), Decimal("1000"))
        self.assertEqual(Decimal(money["amount_received"]), Decimal("400"))
        self.assertEqual(Decimal(money["outstanding_orders"]), Decimal("600"))
        self.assertEqual(Decimal(money["estimated_profit"]), Decimal("300"))
        self.assertEqual(res.data["products"]["low_stock"][0]["name"], "Meat Pie")

    def test_cancelled_orders_are_not_outstanding(self):
        o = self.order(1)
        self.client.force_authenticate(self.admin)
        self.client.patch(f"/api/orders/{o.id}/status/", {"status": "CANCELLED"}, format="json")
        res = self.client.get("/api/dashboard/summary/")
        self.assertEqual(Decimal(res.data["money"]["outstanding_orders"]), Decimal("0"))

    def test_customers_and_revenue_endpoints(self):
        self.order(1)
        self.client.force_authenticate(self.admin)
        self.assertEqual(len(self.client.get("/api/dashboard/customers/").data), 1)
        self.assertEqual(len(self.client.get("/api/dashboard/revenue/?days=7").data), 7)

    def test_public_settings_hide_internal_fields(self):
        res = self.client.get("/api/settings/")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("low_stock_threshold", res.data)
