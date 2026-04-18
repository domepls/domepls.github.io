import sys

from django import get_version
from django.conf import settings
from django.db import connections
from django.urls import reverse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


class ApiRootAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "name": "DoMePls API",
                "status": "ok",
                "debug": settings.DEBUG,
                "django_version": get_version(),
                "python_version": sys.version.split()[0],
            },
            status=status.HTTP_200_OK,
        )


class HealthAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        database_status = "ok"
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception as error:
            database_status = "unavailable"
            return Response(
                {
                    "status": "degraded",
                    "database": database_status,
                    "error": str(error),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "status": "ok",
                "database": database_status,
                "debug": settings.DEBUG,
                "django_version": get_version(),
                "python_version": sys.version.split()[0],
            },
            status=status.HTTP_200_OK,
        )
