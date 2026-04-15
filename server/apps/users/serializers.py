from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "username",
            "password",
            "password_confirm",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")

        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class AuthUserSerializer(serializers.ModelSerializer):
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "telegram_connected",
        )

    def get_telegram_connected(self, instance):
        try:
            profile = instance.profile
        except ObjectDoesNotExist:
            return False

        return bool(profile.telegram_id)


class TelegramAuthSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField(
        required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(
        required=False, allow_blank=True, allow_null=True)
    username = serializers.CharField(
        required=False, allow_blank=True, allow_null=True)
    photo_url = serializers.URLField(
        required=False, allow_blank=True, allow_null=True)
    auth_date = serializers.IntegerField()
    hash = serializers.CharField()
    state = serializers.CharField(
        required=False, allow_blank=True, allow_null=True)


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    first_name = serializers.CharField(
        source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = Profile
        fields = (
            "username",
            "first_name",
            "last_name",
            "avatar",
            "bio",
            "birth_date",
            "location",
            "website",
            "status",
            "points",
            "streak",
            "last_seen",
            "telegram_id",
        )


class ProfileUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(
        source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(
        source="user.last_name", required=False, allow_blank=True)

    class Meta:
        model = Profile
        fields = (
            "avatar",
            "bio",
            "birth_date",
            "location",
            "website",
            "status",
            "first_name",
            "last_name",
        )

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()

        return instance


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def save(self, **kwargs):
        refresh_token = self.validated_data["refresh"]  # type: ignore
        token = RefreshToken(refresh_token)
        token.blacklist()
