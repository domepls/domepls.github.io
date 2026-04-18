from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Chat, ChatMember, ChatMessage

User = get_user_model()


class ChatUserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'avatar')

    def get_avatar(self, obj):
        profile = getattr(obj, 'profile', None)
        if not profile or not profile.avatar:
            return None
        try:
            return profile.avatar.url
        except Exception:
            return None


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ('id', 'chat', 'sender', 'text', 'created_at')


class ChatSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Chat
        fields = (
            'id',
            'type',
            'name',
            'project',
            'project_name',
            'members',
            'last_message',
            'updated_at',
            'created_at',
        )

    def get_members(self, obj):
        users = [
            membership.user for membership in obj.memberships.select_related('user').all()]
        return ChatUserSerializer(users, many=True).data

    def get_last_message(self, obj):
        message = obj.messages.select_related(
            'sender').order_by('-created_at').first()
        if not message:
            return None
        return ChatMessageSerializer(message).data
