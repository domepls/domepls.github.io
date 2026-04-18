from django.db import models
from django.conf import settings
from apps.projects.models import Project


class Task(models.Model):
    class Scope(models.TextChoices):
        PROJECT = 'project', 'Project'
        PERSONAL = 'personal', 'Personal'

    class Status(models.TextChoices):
        TODO = 'todo', 'To Do'
        IN_PROGRESS = 'in_progress', 'In Progress'
        DONE = 'done', 'Done'
        APPROVED = 'approved', 'Approved'
        CANCELLED = 'cancelled', 'Cancelled'

    class Difficulty(models.TextChoices):
        PEACEFUL = 'peaceful', 'Peaceful'
        EASY = 'easy', 'Easy'
        NORMAL = 'normal', 'Normal'
        HARD = 'hard', 'Hard'
        HARDCORE = 'hardcore', 'Hardcore'

    class Urgency(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    scope = models.CharField(
        max_length=20,
        choices=Scope.choices,
        default=Scope.PROJECT,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TODO
    )
    difficulty = models.CharField(
        max_length=20,
        choices=Difficulty.choices,
        default=Difficulty.NORMAL,
    )
    urgency = models.CharField(
        max_length=20,
        choices=Urgency.choices,
        default=Urgency.MEDIUM,
    )
    deadline = models.DateTimeField(null=True, blank=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tasks',
        null=True,
        blank=True,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_tasks'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='delegated_tasks',
        null=True,
        blank=True,
    )
    points_awarded = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class Comment(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment by {self.author.username} on {self.task.title}'
