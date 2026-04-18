from django.urls import path

from .views import (
    TaskApproveAPIView,
    TaskListCreateAPIView,
    TaskDetailAPIView,
    TaskCommentsAPIView,
)

urlpatterns = [
    path("tasks/", TaskListCreateAPIView.as_view(), name="task_list_create"),
    path("tasks/<int:task_id>/", TaskDetailAPIView.as_view(), name="task_detail"),
    path("tasks/<int:task_id>/approve/",
         TaskApproveAPIView.as_view(), name="task_approve"),
    path("tasks/<int:task_id>/comments/",
         TaskCommentsAPIView.as_view(), name="task_comments"),
]
