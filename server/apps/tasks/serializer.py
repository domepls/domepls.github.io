from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.projects.models import Project
from .models import Task, Comment

User = get_user_model()

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

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

    def get_author(self, obj):
        return {
            "id": obj.author.id,
            "username": obj.author.username,
            "email": obj.author.email,
            "first_name": obj.author.first_name,
            "last_name": obj.author.last_name,
        }
    
class TaskListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    assigned_to = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "status",
            "deadline",
            "project",
            "project_name",
            "assigned_to",
            "created_by",
            "created_at",
        )

    def get_assigned_to(self, obj):
        if not obj.assigned_to:
            return None
        return {
            "id": obj.assigned_to.id,
            "username": obj.assigned_to.username,
            "email": obj.assigned_to.email,
        }

    def get_created_by(self, obj):
        return {
            "id": obj.created_by.id,
            "username": obj.created_by.username,
            "email": obj.created_by.email,
        }
    
class TaskDetailSerializer(serializers.ModelSerializer):
    assigned_to = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "status",
            "deadline",
            "project",
            "assigned_to",
            "created_by",
            "created_at",
            "comments",
        )

    def get_assigned_to(self, obj):
        if not obj.assigned_to:
            return None
        return {
            "id": obj.assigned_to.id,
            "username": obj.assigned_to.username,
            "email": obj.assigned_to.email,
            "first_name": obj.assigned_to.first_name,
            "last_name": obj.assigned_to.last_name,
        }

    def get_created_by(self, obj):
        return {
            "id": obj.created_by.id,
            "username": obj.created_by.username,
            "email": obj.created_by.email,
            "first_name": obj.created_by.first_name,
            "last_name": obj.created_by.last_name,
        }

    def get_project(self, obj):
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
            "status",
            "deadline",
            "project",
            "assigned_to",
        )

    def validate_project(self, value):
        request = self.context["request"]
        if not value.members.filter(id=request.user.id).exists():
            raise serializers.ValidationError(
                "You are not a member of this project."
            )
        return value

    def validate_assigned_to(self, value):
        if value is None:
            return value

        project = self.initial_data.get("project")
        if not project:
            return value

        try:
            project_obj = Project.objects.get(id=project)
        except Project.DoesNotExist:
            return value

        if not project_obj.members.filter(id=value.id).exists():
            raise serializers.ValidationError(
                "Assigned user must be a member of the project."
            )
        return value

    def create(self, validated_data):
        request = self.context["request"]
        return Task.objects.create(
            created_by=request.user,
            **validated_data
        )
    
class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = (
            "title",
            "description",
            "status",
            "deadline",
            "assigned_to",
        )

    def validate_assigned_to(self, value):
        if value is None:
            return value

        task = self.instance
        if not task.project.members.filter(id=value.id).exists():
            raise serializers.ValidationError(
                "Assigned user must be a member of the project."
            )
        return value
    
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
            **validated_data
        )