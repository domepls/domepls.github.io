from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers

from apps.social.models import Notification
from apps.social.services import build_profile_url, create_notification, project_link, user_link
from apps.users.models import Profile
from .models import Project

User = get_user_model()


class ProjectMemberSerializer(serializers.ModelSerializer):
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name",
                  "last_name", "telegram_connected")

    def get_telegram_connected(self, obj):
        profile = getattr(obj, "profile", None)
        return bool(profile and profile.telegram_id)


class ProjectListSerializer(serializers.ModelSerializer):
    owner = ProjectMemberSerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    tasks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "owner",
            "members",
            "tasks_count",
            "created_at",
            "updated_at",
        )


class ProjectDetailSerializer(serializers.ModelSerializer):
    owner = ProjectMemberSerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    tasks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "owner",
            "members",
            "tasks_count",
            "created_at",
            "updated_at",
        )


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "name", "description")

    def create(self, validated_data):
        request = self.context["request"]
        project = Project.objects.create(
            owner=request.user,
            **validated_data
        )
        project.members.add(request.user)
        return project


class ProjectInviteSerializer(serializers.Serializer):
    username = serializers.CharField()

    def validate_username(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Username is required.")

        try:
            user = User.objects.select_related("profile").get(username=cleaned)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        profile = getattr(user, "profile", None)
        if not profile or not profile.telegram_id:
            raise serializers.ValidationError(
                "Only users with connected Telegram can be invited.")

        return cleaned

    def save(self, **kwargs):
        project = self.context["project"]
        request = self.context["request"]
        username = self.validated_data["username"]
        user = User.objects.get(username=username)
        project.members.add(user)

        create_notification(
            recipient=user,
            actor=request.user,
            notification_type=Notification.Type.SYSTEM,
            title="Project invitation",
            body=(
                f"{user_link(request.user.username)} invited you to "
                f"project {project_link(project.name, project.id)}."
            ),
            data={
                "project_id": project.id,
                "target_path": f"/app/projects/{project.id}",
                "profile_path": f"/app/users/{request.user.username}",
                "profile_url": build_profile_url(request.user.username),
            },
            send_telegram=True,
        )
        return project


class ProjectInviteCandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name")
