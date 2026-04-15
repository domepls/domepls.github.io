from django.urls import path

from .views import (
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    RefreshAPIView,
    RegisterAPIView,
    TelegramAuthAPIView,
)

urlpatterns = [
    path("auth/register/", RegisterAPIView.as_view(), name="register"),
    path("auth/login/", LoginAPIView.as_view(), name="login"),
    path("auth/refresh/", RefreshAPIView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutAPIView.as_view(), name="logout"),
    path("auth/telegram/", TelegramAuthAPIView.as_view(), name="telegram_auth"),

    path("users/me/", MeAPIView.as_view(), name="users_me"),
]
