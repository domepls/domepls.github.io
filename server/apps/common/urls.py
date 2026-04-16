from django.urls import path

from .views import ApiRootAPIView, HealthAPIView

urlpatterns = [
    path("health/", HealthAPIView.as_view(), name="health"),
    path("", ApiRootAPIView.as_view(), name="api_root"),
]
