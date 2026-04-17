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
    otp_code = serializers.CharField(
        write_only=True, required=False, allow_blank=False)


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


class AuthProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    first_name = serializers.CharField(
        source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            "id",
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
            "two_factor_enabled",
            "telegram_id",
            "telegram_connected",
        )

    def get_telegram_connected(self, instance):
        return bool(instance.telegram_id)


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


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    first_name = serializers.CharField(
        source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    telegram_connected = serializers.SerializerMethodField()

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
            "two_factor_enabled",
            "telegram_id",
            "telegram_connected",
        )

    def get_telegram_connected(self, instance):
        return bool(instance.telegram_id)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        required=False,
        allow_blank=False,
        max_length=150,
    )
    first_name = serializers.CharField(
        source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(
        source="user.last_name", required=False, allow_blank=True)
    current_password = serializers.CharField(
        write_only=True, required=False, allow_blank=False, trim_whitespace=False)
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=False, trim_whitespace=False)
    password_confirm = serializers.CharField(
        write_only=True, required=False, allow_blank=False, trim_whitespace=False)
    two_factor_code = serializers.CharField(
        write_only=True, required=False, allow_blank=False, trim_whitespace=False)

    class Meta:
        model = Profile
        fields = (
            "avatar",
            "bio",
            "birth_date",
            "location",
            "website",
            "status",
            "username",
            "first_name",
            "last_name",
            "two_factor_enabled",
            "current_password",
            "password",
            "password_confirm",
            "two_factor_code",
        )

    def validate(self, attrs):
        user_data = attrs.get("user", {})
        new_password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")
        current_password = attrs.get("current_password")

        if user_data:
            username = user_data.get("username")
            if isinstance(username, str):
                cleaned_username = username.strip()
                if not cleaned_username:
                    raise serializers.ValidationError(
                        {"username": "Username cannot be empty."})

                user = self.instance.user if self.instance else None
                if user and user.__class__.objects.filter(username=cleaned_username).exclude(pk=user.pk).exists():
                    raise serializers.ValidationError(
                        {"username": "This username is already taken."})
                user_data["username"] = cleaned_username

        if new_password or password_confirm or current_password:
            if not current_password:
                raise serializers.ValidationError(
                    {"current_password": "Current password is required."})

            if not self.instance.user.check_password(current_password):
                raise serializers.ValidationError(
                    {"current_password": "Current password is incorrect."})

            if not new_password:
                raise serializers.ValidationError(
                    {"password": "New password is required."})

            if new_password != password_confirm:
                raise serializers.ValidationError(
                    {"password_confirm": "Passwords do not match."})

            validate_password(new_password, user=self.instance.user)

        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        current_password = validated_data.pop("current_password", None)
        new_password = validated_data.pop("password", None)
        validated_data.pop("password_confirm", None)
        validated_data.pop("two_factor_code", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        user = instance.user
        user_update_fields: list[str] = []
        for attr, value in user_data.items():
            setattr(user, attr, value)
            user_update_fields.append(attr)

        if new_password:
            user.set_password(new_password)
            user_update_fields.append("password")

        if user_update_fields:
            user.save(update_fields=user_update_fields)

        return instance


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def save(self, **kwargs):
        refresh_token = self.validated_data["refresh"]  # type: ignore
        token = RefreshToken(refresh_token)
        token.blacklist()
