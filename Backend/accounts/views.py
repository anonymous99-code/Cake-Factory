from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login with a rate limit so passwords cannot be guessed rapidly."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class MeAPIView(APIView):
    """Who is logged in? The admin app uses this to confirm staff access."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "role": user.role,
                "is_staff": user.is_staff,
            }
        )
