from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.users.achievements import assign_achievements_for_user
from apps.users.models import Profile
from apps.social.models import Notification
from apps.social.services import create_notification, task_link, user_link

from .models import Task

User = get_user_model()

DIFFICULTY_POINTS: dict[str, int] = {
    Task.Difficulty.PEACEFUL: 5,
    Task.Difficulty.EASY: 10,
    Task.Difficulty.NORMAL: 20,
    Task.Difficulty.HARD: 35,
    Task.Difficulty.HARDCORE: 60,
}


def _calculate_streak(days: set[date]) -> int:
    streak = 0
    cursor = timezone.localdate()
    while cursor in days:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


def refresh_streak_for_user(user_id: int) -> int:
    profile = Profile.objects.select_related("user").get(user_id=user_id)

    approved_project_dates = Task.objects.filter(
        assigned_to_id=user_id,
        scope=Task.Scope.PROJECT,
        status=Task.Status.APPROVED,
        approved_at__isnull=False,
    ).values_list("approved_at", flat=True)

    personal_done_dates = Task.objects.filter(
        assigned_to_id=user_id,
        scope=Task.Scope.PERSONAL,
        status=Task.Status.DONE,
        completed_at__isnull=False,
    ).values_list("completed_at", flat=True)

    completed_days: set[date] = {
        dt.date() for dt in approved_project_dates if dt is not None
    }
    completed_days.update({dt.date()
                          for dt in personal_done_dates if dt is not None})

    streak = _calculate_streak(completed_days)
    if profile.streak != streak:
        profile.streak = streak
        profile.save(update_fields=["streak"])

    assign_achievements_for_user(profile.user)
    return streak


@transaction.atomic
def approve_project_task(task: Task, approver_id: int) -> Task:
    if task.scope != Task.Scope.PROJECT:
        raise ValueError("Only project tasks can be approved.")

    if task.status == Task.Status.APPROVED:
        return task

    allowed_approver_id = task.assigned_by_id or task.project.owner_id
    if allowed_approver_id != approver_id:
        raise ValueError("Only the assigner can approve this task.")

    if task.status != Task.Status.DONE:
        raise ValueError("Task must be done before approval.")

    points = DIFFICULTY_POINTS.get(task.difficulty, 0)
    task.status = Task.Status.APPROVED
    task.approved_at = timezone.now()
    task.points_awarded = points
    task.save(update_fields=["status", "approved_at", "points_awarded"])

    if task.assigned_to_id:
        profile = Profile.objects.select_for_update().get(user_id=task.assigned_to_id)
        profile.points = profile.points + points
        profile.save(update_fields=["points"])
        refresh_streak_for_user(task.assigned_to_id)

        approver = User.objects.filter(
            id=approver_id).select_related('profile').first()

        create_notification(
            recipient=profile.user,
            actor=approver,
            notification_type=Notification.Type.SYSTEM,
            title="Task approved",
            body=(
                f"Your task {task_link(task.title, task.id)} was approved and "
                f"earned {points} points."
            ),
            data={
                "task_id": task.id,
                "target_path": "/app/tasks",
                "project_id": task.project_id,
            },
            send_telegram=True,
        )

    return task


def mark_task_done(task: Task) -> Task:
    if task.status == Task.Status.DONE:
        return task

    task.status = Task.Status.DONE
    task.completed_at = timezone.now()
    task.save(update_fields=["status", "completed_at"])

    if task.scope == Task.Scope.PERSONAL and task.assigned_to_id:
        refresh_streak_for_user(task.assigned_to_id)

    if task.scope == Task.Scope.PROJECT and task.created_by_id and task.created_by_id != task.assigned_to_id:
        create_notification(
            recipient=task.created_by,
            actor=task.assigned_to,
            notification_type=Notification.Type.SYSTEM,
            title="Task completed",
            body=(
                f"{user_link(task.assigned_to.username)} completed task "
                f"{task_link(task.title, task.id)}."
            ),
            data={
                "task_id": task.id,
                "target_path": "/app/tasks",
                "project_id": task.project_id,
            },
            send_telegram=True,
        )

    return task
