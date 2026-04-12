from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Project

User = get_user_model()


class ProjectMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")


class ProjectListSerializer(serializers.ModelSerializer):
    owner = ProjectMemberSerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    tasks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "owner",
            "members",
            "tasks_count",
            "created_at",
        )


class ProjectDetailSerializer(serializers.ModelSerializer):
    owner = ProjectMemberSerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "owner",
            "members",
            "created_at",
        )


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "name")

    def create(self, validated_data):
        request = self.context["request"]
        project = Project.objects.create(
            owner=request.user,
            **validated_data
        )
        project.members.add(request.user)
        return project


class ProjectInviteSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()

    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return value

    def save(self, **kwargs):
        project = self.context["project"]
        user_id = self.validated_data["user_id"]
        user = User.objects.get(id=user_id)
        project.members.add(user)
        return project