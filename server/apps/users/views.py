from django.conf import settings
from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
import logging
import os
from typing import cast
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    AuthUserSerializer,
    LoginSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    TelegramAuthSerializer,
    RegisterSerializer,
)
from .models import Profile
from config.jwt import (
    clear_refresh_cookie,
    get_refresh_token_from_request,
    set_refresh_cookie,
    validate_telegram_auth_payload,
)


logger = logging.getLogger(__name__)


def _infer_image_extension(photo_url: str, content_type: str) -> str:
    ext = os.path.splitext(urlparse(photo_url).path)[1].lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if ext in allowed:
        return ext

    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    return mapping.get(content_type.lower(), ".jpg")


def _save_avatar_from_url(profile: Profile, photo_url: str) -> bool:
    try:
        request = Request(photo_url, headers={"User-Agent": "DoMePls/1.0"})
        with urlopen(request, timeout=10) as response:
            content_type = response.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                return False

            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > 5 * 1024 * 1024:
                return False

            image_data = response.read()
            if not image_data:
                return False

        extension = _infer_image_extension(photo_url, content_type)
        filename = f"telegram_avatar_{profile.user.id}{extension}"
        profile.avatar.save(filename, ContentFile(image_data), save=False)
        return True
    except Exception as error:
        logger.warning(
            "Unable to fetch Telegram avatar for user_id=%s: %s", profile.user.id, error)
        return False


class RegisterAPIView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "message": "User registered successfully.",
                "user": AuthUserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, str(refresh))
        return response


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]  # type: ignore
        password = serializer.validated_data["password"]  # type: ignore

        user = authenticate(request, username=username, password=password)

        if user is None:
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        Profile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "message": "Login successful.",
                "user": AuthUserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, str(refresh))
        return response


class RefreshAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = get_refresh_token_from_request(request)
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        serializer.is_valid(raise_exception=True)
        validated_data = cast(dict[str, str], serializer.validated_data or {})

        response = Response(
            {"tokens": {"access": validated_data["access"]}},
            status=status.HTTP_200_OK,
        )

        new_refresh = validated_data.get("refresh")
        if new_refresh:
            set_refresh_cookie(response, str(new_refresh))

        return response


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = get_refresh_token_from_request(request)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        response = Response(
            {"message": "Logout successful."},
            status=status.HTTP_205_RESET_CONTENT,
        )
        clear_refresh_cookie(response)
        return response


class TelegramAuthAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
        bot_id = bot_token.split(":", 1)[0] if bot_token else ""
        if not bot_id.isdigit():
            return Response(
                {"detail": "Telegram bot token is not configured correctly."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"bot_id": bot_id}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = TelegramAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = cast(
            dict[str, object], serializer.validated_data or {})

        try:
            validate_telegram_auth_payload(validated_data)
        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile, _ = Profile.objects.get_or_create(user=request.user)
        telegram_id = cast(int, validated_data["id"])

        if profile.telegram_id and profile.telegram_id != telegram_id:
            return Response(
                {"detail": "This account is already linked to Telegram."},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                profile.telegram_id = telegram_id
                user = request.user
                user_update_fields: list[str] = []

                first_name = validated_data.get("first_name")
                if isinstance(first_name, str):
                    cleaned_first_name = first_name.strip()[:150]
                    if user.first_name != cleaned_first_name:
                        user.first_name = cleaned_first_name
                        user_update_fields.append("first_name")

                last_name = validated_data.get("last_name")
                if isinstance(last_name, str):
                    cleaned_last_name = last_name.strip()[:150]
                    if user.last_name != cleaned_last_name:
                        user.last_name = cleaned_last_name
                        user_update_fields.append("last_name")

                if user_update_fields:
                    user.save(update_fields=user_update_fields)

                photo_url = validated_data.get("photo_url")
                profile_update_fields = ["telegram_id"]

                if isinstance(photo_url, str) and photo_url:
                    if _save_avatar_from_url(profile, photo_url):
                        profile_update_fields.append("avatar")

                profile.save(update_fields=profile_update_fields)
        except IntegrityError:
            return Response(
                {"detail": "This Telegram account is already linked elsewhere."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "message": "Telegram account connected successfully.",
                "user": AuthUserSerializer(request.user).data,
                "profile": ProfileSerializer(profile).data,
            },
            status=status.HTTP_200_OK,
        )


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileUpdateSerializer(
            profile,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)
