from django.urls import path

from .views import (
    ProjectListCreateAPIView,
    ProjectDetailAPIView,
    ProjectInviteCandidatesAPIView,
    ProjectInviteAPIView,
)

urlpatterns = [
    path("projects/", ProjectListCreateAPIView.as_view(),
         name="project_list_create"),
    path("projects/<int:project_id>/",
         ProjectDetailAPIView.as_view(), name="project_detail"),
    path("projects/<int:project_id>/invite/",
         ProjectInviteAPIView.as_view(), name="project_invite"),
    path("projects/invite-candidates/", ProjectInviteCandidatesAPIView.as_view(),
         name="project_invite_candidates"),
]
