from django.db import models

from apps.projects.models import Project
from apps.users.signals import User

class Task(models.Model):
    STATUS = [("todo", "To Do"), ("progress", "In Progress"), ("done", "Done"), ("paused", "Paused")]

    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(choices=STATUS, default="todo")
    deadline = models.DateTimeField(null=True)

    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_tasks")

    created_at = models.DateTimeField(auto_now_add=True)
