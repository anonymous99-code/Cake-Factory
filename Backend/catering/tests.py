from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from catering.models import CateringInquiry

User = get_user_model()


class CateringFlowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("owner", password="pw-for-tests-123", is_staff=True)

    def submit(self, **extra):
        data = {
            "service_type": "BOTH",
            "customer_name": "Chidi Eze",
            "customer_phone": "08099998888",
            "event_type": "Wedding",
            "event_date": str(timezone.localdate() + timedelta(days=30)),
            "event_location": "Lagos",
            "estimated_guest_count": 150,
        }
        data.update(extra)
        return self.client.post("/api/catering/inquiries/", data, format="json")

    def test_public_can_submit(self):
        res = self.submit()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(CateringInquiry.objects.get().status, "NEW")

    def test_past_event_rejected(self):
        self.assertEqual(self.submit(event_date="2020-01-01").status_code, 400)

    def test_public_cannot_read_inquiries(self):
        self.submit()
        self.assertEqual(self.client.get("/api/catering/inquiries/all/").status_code, 401)

    def test_full_workflow(self):
        self.submit()
        pk = CateringInquiry.objects.get().id
        self.client.force_authenticate(self.admin)
        status = lambda s, **k: self.client.patch(f"/api/catering/inquiries/{pk}/status/", {"status": s, **k}, format="json")

        self.assertEqual(status("QUOTATION_SENT").status_code, 400)  # cannot skip
        self.assertEqual(status("CONTACTED").status_code, 200)
        self.assertEqual(status("QUOTATION_SENT").status_code, 400)  # needs a price
        self.assertEqual(status("QUOTATION_SENT", quoted_amount="450000").status_code, 200)
        self.assertEqual(status("ACCEPTED").status_code, 400)  # must use accept action

        res = self.client.post(f"/api/catering/inquiries/{pk}/accept/", {"deposit_amount": "200000"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["status"], "ACCEPTED")
        self.assertEqual(Decimal(res.data["booking"]["outstanding_balance"]), Decimal("250000"))

    def test_deposit_cannot_exceed_agreed(self):
        self.submit()
        pk = CateringInquiry.objects.get().id
        self.client.force_authenticate(self.admin)
        self.client.patch(f"/api/catering/inquiries/{pk}/status/", {"status": "CONTACTED"}, format="json")
        self.client.patch(f"/api/catering/inquiries/{pk}/status/", {"status": "QUOTATION_SENT", "quoted_amount": "1000"}, format="json")
        res = self.client.post(f"/api/catering/inquiries/{pk}/accept/", {"deposit_amount": "5000"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(hasattr(CateringInquiry.objects.get(), "booking"))
