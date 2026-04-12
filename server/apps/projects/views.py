from django.shortcuts import render

from django.db.models import Count, Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.serializer import ProjectCreateSerializer, ProjectDetailSerializer, ProjectInviteSerializer, ProjectListSerializer

from .models import Project


class ProjectListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

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


class ProjectDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ProjectDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "project_id"

    def get_queryset(self):
        return (
            Project.objects.filter(
                Q(owner=self.request.user) | Q(members=self.request.user)
            )
            .distinct()
            .select_related("owner")
            .prefetch_related("members")
        )


class ProjectInviteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if project.owner != request.user:
            raise PermissionDenied("Only the project owner can invite members.")

        serializer = ProjectInviteSerializer(
            data=request.data,
            context={"project": project, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            ProjectDetailSerializer(project, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )