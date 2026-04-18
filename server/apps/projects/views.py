from django.db.models import Count, Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.serializer import (
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectInviteCandidateSerializer,
    ProjectInviteSerializer,
    ProjectListSerializer,
)
from apps.common.permissions import IsTelegramLinked
from apps.users.models import Profile

from .models import Project


class ProjectListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsTelegramLinked]

    def get_queryset(self):
        return (
            Project.objects.filter(
                Q(owner=self.request.user) | Q(members=self.request.user)
            )
            .distinct()
            .annotate(tasks_count=Count("tasks"))
            .select_related("owner")
            .prefetch_related("members")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectCreateSerializer
        return ProjectListSerializer

    def get_serializer_context(self):
        return {"request": self.request}


class ProjectDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectDetailSerializer
    permission_classes = [IsTelegramLinked]
    lookup_url_kwarg = "project_id"

    def get_queryset(self):
        return (
            Project.objects.filter(
                Q(owner=self.request.user) | Q(members=self.request.user)
            )
            .distinct()
            .annotate(tasks_count=Count("tasks"))
            .select_related("owner")
            .prefetch_related("members")
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return ProjectCreateSerializer
        return ProjectDetailSerializer

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if project.owner != request.user:
            raise PermissionDenied(
                "Only project owner can update this project.")

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(
            project, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        project = (
            Project.objects.annotate(tasks_count=Count("tasks"))
            .select_related("owner")
            .prefetch_related("members")
            .get(id=project.id)
        )
        return Response(ProjectDetailSerializer(project, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if project.owner != request.user:
            raise PermissionDenied(
                "Only project owner can delete this project.")

        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectInviteAPIView(APIView):
    permission_classes = [IsTelegramLinked]

    def post(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if project.owner != request.user:
            raise PermissionDenied(
                "Only the project owner can invite members.")

        serializer = ProjectInviteSerializer(
            data=request.data,
            context={"project": project, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        project = (
            Project.objects.annotate(tasks_count=Count("tasks"))
            .select_related("owner")
            .prefetch_related("members")
            .get(id=project.id)
        )

        return Response(
            ProjectDetailSerializer(
                project, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class ProjectInviteCandidatesAPIView(APIView):
    permission_classes = [IsTelegramLinked]

    def get(self, request):
        username_query = self.request.query_params.get("username", "").strip()
        if len(username_query) < 2:
            return Response([])

        profiles = (
            Profile.objects.select_related("user")
            .filter(telegram_id__isnull=False)
            .exclude(user=self.request.user)
            .filter(
                Q(user__username__icontains=username_query)
                | Q(user__first_name__icontains=username_query)
                | Q(user__last_name__icontains=username_query)
            )
            .order_by("user__username")[:20]
        )

        users = [profile.user for profile in profiles]
        serializer = ProjectInviteCandidateSerializer(users, many=True)
        return Response(serializer.data)
