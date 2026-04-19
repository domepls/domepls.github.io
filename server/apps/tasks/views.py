from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tasks.serializer import (
    CommentCreateSerializer,
    CommentSerializer,
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskUpdateSerializer,
)
from apps.common.permissions import IsTelegramLinked
from apps.social.models import Notification
from apps.social.services import create_notification, task_link, user_link

from .gamification import approve_project_task, mark_task_done, refresh_streak_for_user
from .models import Task, Comment


class TaskListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsTelegramLinked]

    def get_queryset(self):
        return (
            Task.objects.filter(
                Q(project__owner=self.request.user)
                | Q(project__members=self.request.user)
                | Q(assigned_to=self.request.user)
                | Q(created_by=self.request.user)
            )
            .distinct()
            .select_related("project", "assigned_to", "created_by", "assigned_by")
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
                Q(project__owner=self.request.user)
                | Q(project__members=self.request.user)
                | Q(assigned_to=self.request.user)
                | Q(created_by=self.request.user)
            )
            .distinct()
            .select_related("project", "assigned_to", "created_by", "assigned_by")
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

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(
            task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        status_value = serializer.validated_data.get("status")
        if status_value == Task.Status.DONE:
            mark_task_done(task)
        elif task.scope == Task.Scope.PERSONAL and status_value in [Task.Status.TODO, Task.Status.IN_PROGRESS]:
            task.completed_at = None
            task.save(update_fields=["completed_at"])
            if task.assigned_to_id:
                refresh_streak_for_user(task.assigned_to_id)

        return Response(
            TaskDetailSerializer(task, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()

        if task.scope == Task.Scope.PROJECT:
            if request.user.id not in [task.created_by_id, task.project.owner_id]:
                raise PermissionDenied(
                    "Only creator or project owner can delete this task.")
        elif request.user.id != task.created_by_id:
            raise PermissionDenied("Only task owner can delete personal task.")

        assigned_to_id = task.assigned_to_id

        task.delete()
        if assigned_to_id:
            refresh_streak_for_user(assigned_to_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskApproveAPIView(APIView):
    permission_classes = [IsTelegramLinked]

    def post(self, request, task_id):
        try:
            task = Task.objects.select_related(
                "project", "assigned_to").get(id=task_id)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        if task.scope != Task.Scope.PROJECT:
            return Response(
                {"detail": "Only project tasks can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            approve_project_task(task, request.user.id)
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        if task.assigned_to_id:
            create_notification(
                recipient=task.assigned_to,
                actor=request.user,
                notification_type=Notification.Type.SYSTEM,
                title="Task approved",
                body=(
                    f"{user_link(request.user.username)} approved task "
                    f"{task_link(task.title, task.id)}."
                ),
                data={
                    "task_id": task.id,
                    "target_path": "/app/tasks",
                    "project_id": task.project_id,
                },
                send_telegram=True,
            )

        serializer = TaskDetailSerializer(task, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class TaskCommentsAPIView(APIView):
    permission_classes = [IsTelegramLinked]

    def get_task(self, request, task_id):
        try:
            task = Task.objects.select_related(
                "project", "created_by", "assigned_to").get(id=task_id)
        except Task.DoesNotExist:
            return None

        if task.scope == Task.Scope.PROJECT and task.project:
            has_access = (
                task.project.owner == request.user
                or task.project.members.filter(id=request.user.id).exists()
                or task.assigned_to == request.user
                or task.created_by == request.user
            )
        else:
            has_access = task.created_by == request.user or task.assigned_to == request.user

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

        recipients = []
        if task.assigned_to_id and task.assigned_to_id != request.user.id:
            recipients.append(task.assigned_to)
        if task.created_by_id and task.created_by_id != request.user.id and task.created_by_id != task.assigned_to_id:
            recipients.append(task.created_by)

        for recipient in recipients:
            create_notification(
                recipient=recipient,
                actor=request.user,
                notification_type=Notification.Type.SYSTEM,
                title="New task comment",
                body=(
                    f"{user_link(request.user.username)} commented on task "
                    f"{task_link(task.title, task.id)}."
                ),
                data={
                    "task_id": task.id,
                    "target_path": "/app/tasks",
                    "comment_id": comment.id,
                    "project_id": task.project_id,
                },
                send_telegram=True,
            )

        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )
