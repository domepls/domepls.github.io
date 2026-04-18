from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.users.achievements import get_user_achievements_payload
from apps.users.models import Profile
from .models import FriendRequest, Notification

User = get_user_model()


class PublicUserSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    avatar = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    birth_date = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    website = serializers.SerializerMethodField()
    telegram_connected = serializers.SerializerMethodField()
    points = serializers.SerializerMethodField()
    streak = serializers.SerializerMethodField()
    achievements = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'first_name',
            'last_name',
            'avatar',
            'status',
            'bio',
            'birth_date',
            'location',
            'website',
            'telegram_connected',
            'points',
            'streak',
            'achievements',
        )

    def _profile(self, obj):
        return getattr(obj, 'profile', None)

    def get_avatar(self, obj):
        profile = self._profile(obj)
        if not profile or not profile.avatar:
            return None
        try:
            return profile.avatar.url
        except Exception:
            return None

    def get_status(self, obj):
        profile = self._profile(obj)
        return profile.status if profile else ''

    def get_bio(self, obj):
        profile = self._profile(obj)
        return profile.bio if profile else ''

    def get_birth_date(self, obj):
        profile = self._profile(obj)
        if not profile or not profile.birth_date:
            return None
        return profile.birth_date.isoformat()

    def get_location(self, obj):
        profile = self._profile(obj)
        return profile.location if profile else ''

    def get_website(self, obj):
        profile = self._profile(obj)
        return profile.website if profile else ''

    def get_telegram_connected(self, obj):
        profile = self._profile(obj)
        return bool(profile and profile.telegram_id)

    def get_points(self, obj):
        profile = self._profile(obj)
        return profile.points if profile else 0

    def get_streak(self, obj):
        profile = self._profile(obj)
        return profile.streak if profile else 0

    def get_achievements(self, obj):
        return get_user_achievements_payload(obj)


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = PublicUserSerializer(read_only=True)
    to_user = PublicUserSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = (
            'id',
            'from_user',
            'to_user',
            'status',
            'created_at',
            'updated_at',
        )


class NotificationSerializer(serializers.ModelSerializer):
    actor = PublicUserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = (
            'id',
            'type',
            'title',
            'body',
            'data',
            'is_read',
            'created_at',
            'actor',
        )
