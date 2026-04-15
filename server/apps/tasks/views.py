from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tasks.serializer import CommentCreateSerializer, CommentSerializer, TaskCreateSerializer, TaskDetailSerializer, TaskListSerializer, TaskUpdateSerializer
from apps.common.permissions import IsTelegramLinked

from .models import Task, Comment


class TaskListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsTelegramLinked]

    def get_queryset(self):
        return (
            Task.objects.filter(
                Q(project__owner=self.request.user) |
                Q(project__members=self.request.user) |
                Q(assigned_to=self.request.user) |
                Q(created_by=self.request.user)
            )
            .distinct()
            .select_related("project", "assigned_to", "created_by")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TaskCreateSerializer
        return TaskListSerializer

    def get_serializer_context(self):
        return {"request": self.request}


class TaskDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsTelegramLinked]
    lookup_url_kwarg = "task_id"

    def get_queryset(self):
        return (
            Task.objects.filter(
                Q(project__owner=self.request.user) |
                Q(project__members=self.request.user) |
                Q(assigned_to=self.request.user) |
                Q(created_by=self.request.user)
            )
            .distinct()
            .select_related("project", "assigned_to", "created_by")
            .prefetch_related("comments__author")
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return TaskUpdateSerializer
        return TaskDetailSerializer

    def get_serializer_context(self):
        return {"request": self.request}

    def update(self, request, *args, **kwargs):
        task = self.get_object()

        if request.user not in [task.created_by, task.project.owner] and \
           not task.project.members.filter(id=request.user.id).exists():
            raise PermissionDenied(
                "You do not have permission to update this task.")

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(
            task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            TaskDetailSerializer(task, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()

        if request.user != task.created_by and request.user != task.project.owner:
            raise PermissionDenied(
                "Only creator or project owner can delete this task.")

        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskCommentsAPIView(APIView):
    permission_classes = [IsTelegramLinked]

    def get_task(self, request, task_id):
        try:
            task = Task.objects.select_related(
                "project", "created_by", "assigned_to").get(id=task_id)
        except Task.DoesNotExist:
            return None

        has_access = (
            task.project.owner == request.user
            or task.project.members.filter(id=request.user.id).exists()
            or task.assigned_to == request.user
            or task.created_by == request.user
        )

        if not has_access:
            raise PermissionDenied("You do not have access to this task.")

        return task

    def get(self, request, task_id):
        task = self.get_task(request, task_id)
        if task is None:
            return Response(
                {"detail": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        comments = task.comments.select_related(
            "author").order_by("created_at")
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request, task_id):
        task = self.get_task(request, task_id)
        if task is None:
            return Response(
                {"detail": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CommentCreateSerializer(
            data=request.data,
            context={"request": request, "task": task},
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()

        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )
