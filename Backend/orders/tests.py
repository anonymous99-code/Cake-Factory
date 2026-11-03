from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from availability.models import ProductAvailability
from dashboard.models import SiteSettings
from orders.models import Order
from products.models import Product

User = get_user_model()


class OrderBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("owner", password="pw-for-tests-123", is_staff=True)
        self.pie = Product.objects.create(name="Meat Pie", price=Decimal("500"), available_quantity=10)
        self.roll = Product.objects.create(name="Sausage Roll", price=Decimal("300"), available_quantity=4)

    def place(self, items=None, **extra):
        payload = {
            "customer_name": "Ada Obi",
            "customer_phone": "08012345678",
            "fulfillment_method": "PICKUP",
            "items": items or [{"product_id": self.pie.id, "quantity": 2}],
        }
        payload.update(extra)
        return self.client.post("/api/orders/", payload, format="json")

    def login(self):
        self.client.force_authenticate(self.admin)


class OrderCreationTests(OrderBase):
    def test_creates_order_and_deducts_stock(self):
        res = self.place()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Decimal(res.data["total_amount"]), Decimal("1000"))
        self.pie.refresh_from_db()
        self.assertEqual(self.pie.available_quantity, 8)

    def test_duplicate_lines_are_combined_and_checked_together(self):
        res = self.place(items=[
            {"product_id": self.roll.id, "quantity": 3},
            {"product_id": self.roll.id, "quantity": 3},
        ])
        self.assertEqual(res.status_code, 400)
        self.roll.refresh_from_db()
        self.assertEqual(self.roll.available_quantity, 4)

    def test_cannot_order_more_than_stock(self):
        res = self.place(items=[{"product_id": self.pie.id, "quantity": 11}])
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_failed_order_does_not_change_any_stock(self):
        res = self.place(items=[
            {"product_id": self.pie.id, "quantity": 2},
            {"product_id": self.roll.id, "quantity": 99},
        ])
        self.assertEqual(res.status_code, 400)
        self.pie.refresh_from_db()
        self.assertEqual(self.pie.available_quantity, 10)

    def test_inactive_product_cannot_be_ordered(self):
        self.pie.is_active = False
        self.pie.save()
        self.assertEqual(self.place().status_code, 400)

    def test_delivery_requires_address_and_adds_fee(self):
        site = SiteSettings.load()
        site.delivery_fee = Decimal("700")
        site.free_delivery_threshold = Decimal("3000")
        site.save()
        self.assertEqual(self.place(fulfillment_method="DELIVERY").status_code, 400)
        res = self.place(fulfillment_method="DELIVERY", delivery_address="12 Palm Street")
        self.assertEqual(Decimal(res.data["delivery_fee"]), Decimal("700"))
        self.assertEqual(Decimal(res.data["total_amount"]), Decimal("1700"))
        big = self.place(
            items=[{"product_id": self.pie.id, "quantity": 8}, ],
            fulfillment_method="DELIVERY",
            delivery_address="12 Palm Street",
        )
        self.assertEqual(Decimal(big.data["delivery_fee"]), Decimal("0"))

    def test_past_date_rejected(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        res = self.place(requested_pickup_date=str(yesterday))
        self.assertEqual(res.status_code, 400)

    def test_orders_can_be_switched_off(self):
        site = SiteSettings.load()
        site.accepts_orders = False
        site.save()
        self.assertEqual(self.place().status_code, 400)


class AdvanceOrderTests(OrderBase):
    def setUp(self):
        super().setUp()
        self.day = timezone.localdate() + timedelta(days=3)
        self.row = ProductAvailability.objects.create(
            product=self.pie, date=self.day, available_quantity=5, status="UPCOMING"
        )

    def test_advance_order_uses_schedule_not_daily_stock(self):
        res = self.place(requested_pickup_date=str(self.day), items=[{"product_id": self.pie.id, "quantity": 3}])
        self.assertEqual(res.status_code, 201, res.data)
        self.row.refresh_from_db()
        self.pie.refresh_from_db()
        self.assertEqual(self.row.available_quantity, 2)
        self.assertEqual(self.pie.available_quantity, 10)

    def test_overbooking_prevented(self):
        self.place(requested_pickup_date=str(self.day), items=[{"product_id": self.pie.id, "quantity": 4}])
        res = self.place(requested_pickup_date=str(self.day), items=[{"product_id": self.pie.id, "quantity": 2}])
        self.assertEqual(res.status_code, 400)

    def test_unscheduled_date_rejected(self):
        other = timezone.localdate() + timedelta(days=5)
        res = self.place(requested_pickup_date=str(other))
        self.assertEqual(res.status_code, 400)

    def test_cancel_restores_schedule(self):
        res = self.place(requested_pickup_date=str(self.day), items=[{"product_id": self.pie.id, "quantity": 5}])
        self.row.refresh_from_db()
        self.assertEqual(self.row.status, "SOLD_OUT")
        self.login()
        self.client.patch(f"/api/orders/{res.data and Order.objects.get().id}/status/", {"status": "CANCELLED"}, format="json")
        self.row.refresh_from_db()
        self.assertEqual(self.row.available_quantity, 5)
        self.assertEqual(self.row.status, "UPCOMING")


class StatusAndCancellationTests(OrderBase):
    def setUp(self):
        super().setUp()
        self.place()
        self.order = Order.objects.get()
        self.login()

    def patch(self, status):
        return self.client.patch(f"/api/orders/{self.order.id}/status/", {"status": status}, format="json")

    def test_public_cannot_list_or_update(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/orders/all/").status_code, 401)
        self.assertEqual(self.patch("CONFIRMED").status_code, 401)

    def test_list_endpoint_for_admin(self):
        res = self.client.get("/api/orders/all/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_valid_flow_for_pickup(self):
        for step in ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]:
            self.assertEqual(self.patch(step).status_code, 200, step)

    def test_cannot_skip_steps(self):
        self.assertEqual(self.patch("COMPLETED").status_code, 400)
        self.assertEqual(self.patch("READY").status_code, 400)

    def test_pickup_cannot_go_out_for_delivery(self):
        for step in ["CONFIRMED", "PREPARING", "READY"]:
            self.patch(step)
        self.assertEqual(self.patch("OUT_FOR_DELIVERY").status_code, 400)

    def test_cancel_restores_stock_once(self):
        self.pie.refresh_from_db()
        self.assertEqual(self.pie.available_quantity, 8)
        self.assertEqual(self.patch("CANCELLED").status_code, 200)
        self.assertEqual(self.patch("CANCELLED").status_code, 200)  # repeating is harmless
        self.pie.refresh_from_db()
        self.assertEqual(self.pie.available_quantity, 10)

    def test_cancelled_order_is_final(self):
        self.patch("CANCELLED")
        self.assertEqual(self.patch("CONFIRMED").status_code, 400)


class PaymentTests(OrderBase):
    def setUp(self):
        super().setUp()
        self.place()  # total 1000
        self.order = Order.objects.get()
        self.login()

    def pay(self, amount, kind="PAYMENT", reference=""):
        return self.client.post(
            f"/api/orders/{self.order.id}/payments/",
            {"amount": amount, "kind": kind, "method": "TRANSFER", "reference": reference},
            format="json",
        )

    def test_partial_then_full_then_refund(self):
        self.assertEqual(self.pay("400").data["payment_status"], "PARTIAL")
        self.assertEqual(self.pay("600").data["payment_status"], "PAID")
        res = self.pay("1000", kind="REFUND")
        self.assertEqual(res.data["payment_status"], "REFUNDED")
        self.assertEqual(Decimal(res.data["amount_paid"]), Decimal("0"))

    def test_cannot_overpay(self):
        self.assertEqual(self.pay("1500").status_code, 400)

    def test_cannot_refund_more_than_received(self):
        self.pay("300")
        self.assertEqual(self.pay("500", kind="REFUND").status_code, 400)

    def test_duplicate_reference_rejected(self):
        self.assertEqual(self.pay("100", reference="TRX-1").status_code, 201)
        self.assertEqual(self.pay("100", reference="TRX-1").status_code, 400)

    def test_client_cannot_set_payment_status(self):
        res = self.client.patch(f"/api/orders/{self.order.id}/status/", {"status": "CONFIRMED", "payment_status": "PAID"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, "UNPAID")

    def test_public_tracking_hides_contact_details(self):
        self.client.force_authenticate(None)
        res = self.client.get(f"/api/orders/track/{self.order.order_number}/")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("customer_phone", res.data)
