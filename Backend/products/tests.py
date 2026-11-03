from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from products.models import Product

User = get_user_model()


class ProductTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("owner", password="pw-for-tests-123", is_staff=True)
        self.shown = Product.objects.create(name="Meat Pie", price=500, available_quantity=5)
        self.hidden = Product.objects.create(name="Old Item", price=100, is_active=False)

    def test_public_only_sees_active_products(self):
        names = [p["name"] for p in self.client.get("/api/products/").data]
        self.assertEqual(names, ["Meat Pie"])

    def test_admin_sees_inactive_too(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(len(self.client.get("/api/products/").data), 2)

    def test_public_cannot_modify(self):
        self.assertEqual(self.client.post("/api/products/", {"name": "x", "price": 1}).status_code, 401)
        self.assertEqual(self.client.delete(f"/api/products/{self.shown.id}/").status_code, 401)

    def test_price_must_be_positive(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/products/", {"name": "Cake", "price": "0", "category": "CAKES"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_delete_hides_instead_of_erasing(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/products/{self.shown.id}/").status_code, 204)
        self.shown.refresh_from_db()
        self.assertFalse(self.shown.is_active)
