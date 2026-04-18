from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.projects.models import Project
from apps.users.models import Profile
from .models import Comment, Task

User = get_user_model()


class TaskUserSerializer(serializers.ModelSerializer):
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "telegram_connected",
        )

    def get_telegram_connected(self, obj):
        profile = getattr(obj, "profile", None)
        return bool(profile and profile.telegram_id)


class CommentSerializer(serializers.ModelSerializer):
    author = TaskUserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = (
            "id",
            "task",
            "author",
            "text",
            "created_at",
        )
        read_only_fields = ("id", "author", "created_at", "task")


class TaskListSerializer(serializers.ModelSerializer):
    project = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    assigned_to = TaskUserSerializer(read_only=True)
    created_by = TaskUserSerializer(read_only=True)
    assigned_by = TaskUserSerializer(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "scope",
            "status",
            "difficulty",
            "urgency",
            "deadline",
            "project",
            "project_name",
            "assigned_to",
            "created_by",
            "assigned_by",
            "points_awarded",
            "completed_at",
            "approved_at",
            "created_at",
            "updated_at",
        )

    def get_project(self, obj):
        if not obj.project:
            return None
        return {
            "id": obj.project.id,
            "name": obj.project.name,
        }

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None


class TaskDetailSerializer(serializers.ModelSerializer):
    assigned_to = TaskUserSerializer(read_only=True)
    created_by = TaskUserSerializer(read_only=True)
    assigned_by = TaskUserSerializer(read_only=True)
    project = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "scope",
            "status",
            "difficulty",
            "urgency",
            "deadline",
            "project",
            "assigned_to",
            "created_by",
            "assigned_by",
            "points_awarded",
            "completed_at",
            "approved_at",
            "created_at",
            "updated_at",
            "comments",
        )

    def get_project(self, obj):
        if not obj.project:
            return None
        return {
            "id": obj.project.id,
            "name": obj.project.name,
        }


class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "scope",
            "status",
            "difficulty",
            "urgency",
            "deadline",
            "project",
            "assigned_to",
        )

    def validate(self, attrs):
        request = self.context["request"]
        scope = attrs.get("scope", Task.Scope.PROJECT)
        project = attrs.get("project")
        assigned_to = attrs.get("assigned_to")

        if scope == Task.Scope.PROJECT:
            if not project:
                raise serializers.ValidationError(
                    {"project": "Project is required for project tasks."})

            if project.owner_id != request.user.id:
                raise serializers.ValidationError(
                    {"project": "Only project owner can create project tasks."}
                )

            if (
                assigned_to
                and assigned_to.id != project.owner_id
                and not project.members.filter(id=assigned_to.id).exists()
            ):
                raise serializers.ValidationError(
                    {"assigned_to": "Assigned user must be a project member."}
                )

            if not assigned_to:
                attrs["assigned_to"] = request.user
                assigned_to = request.user

            profile = Profile.objects.filter(user_id=assigned_to.id).first()
            if not profile or not profile.telegram_id:
                raise serializers.ValidationError(
                    {"assigned_to": "Task assignee must have connected Telegram."}
                )
        else:
            attrs["project"] = None
            attrs["assigned_to"] = request.user
            attrs["status"] = Task.Status.TODO

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return Task.objects.create(
            created_by=request.user,
            assigned_by=request.user,
            **validated_data,
        )


class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = (
            "title",
            "description",
            "status",
            "difficulty",
            "urgency",
            "deadline",
            "assigned_to",
        )

    def validate(self, attrs):
        request = self.context["request"]
        task = self.instance

        assigned_to = attrs.get("assigned_to")
        new_status = attrs.get("status")

        if task.scope == Task.Scope.PROJECT:
            if request.user.id != task.project.owner_id and request.user.id != task.assigned_to_id:
                raise serializers.ValidationError(
                    "Only owner or assignee can update this task.")

            if assigned_to is not None:
                if request.user.id != task.project.owner_id:
                    raise serializers.ValidationError(
                        {"assigned_to": "Only project owner can reassign users."}
                    )

                if (
                    assigned_to.id != task.project.owner_id
                    and not task.project.members.filter(id=assigned_to.id).exists()
                ):
                    raise serializers.ValidationError(
                        {"assigned_to": "Assigned user must be a project member."}
                    )

                profile = Profile.objects.filter(
                    user_id=assigned_to.id).first()
                if not profile or not profile.telegram_id:
                    raise serializers.ValidationError(
                        {"assigned_to": "Task assignee must have connected Telegram."}
                    )

            if new_status == Task.Status.APPROVED:
                raise serializers.ValidationError(
                    {"status": "Use task approval endpoint."})
        else:
            if task.created_by_id != request.user.id:
                raise serializers.ValidationError(
                    "Only task owner can update personal task.")

            if assigned_to is not None and assigned_to.id != request.user.id:
                raise serializers.ValidationError(
                    {"assigned_to": "Personal tasks can only be assigned to yourself."}
                )

            if new_status == Task.Status.APPROVED:
                raise serializers.ValidationError(
                    {"status": "Personal tasks cannot be approved."})

        return attrs


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ("id", "text")

    def create(self, validated_data):
        request = self.context["request"]
        task = self.context["task"]

        return Comment.objects.create(
            task=task,
            author=request.user,
            **validated_data,
        )
