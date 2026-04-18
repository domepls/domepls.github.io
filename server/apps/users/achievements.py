from __future__ import annotations

from dataclasses import dataclass
from django.contrib.auth import get_user_model
from typing import Any

from .models import Achievement, Profile, UserAchievement

User = get_user_model()


@dataclass(frozen=True)
class AchievementSeed:
    code: str
    title: str
    description: str
    points_required: int = 0
    streak_required: int = 0
    approved_tasks_required: int = 0


BASE_ACHIEVEMENTS: tuple[AchievementSeed, ...] = (
    AchievementSeed("welcome", "Welcome Aboard",
                    "Connect Telegram and complete your first setup."),
    AchievementSeed("first_approve", "First Confirmed Task",
                    "Get your first project task approved.", approved_tasks_required=1),
    AchievementSeed("task_runner", "Task Runner",
                    "Get 5 project tasks approved.", approved_tasks_required=5),
    AchievementSeed("task_machine", "Task Machine",
                    "Get 15 project tasks approved.", approved_tasks_required=15),
    AchievementSeed("points_100", "Power 100",
                    "Reach 100 points.", points_required=100),
    AchievementSeed("points_300", "Power 300",
                    "Reach 300 points.", points_required=300),
    AchievementSeed("streak_3", "3-Day Spark",
                    "Keep a 3 day streak.", streak_required=3),
    AchievementSeed("streak_7", "Weekly Flame",
                    "Keep a 7 day streak.", streak_required=7),
    AchievementSeed("streak_14", "Two-Week Grind",
                    "Keep a 14 day streak.", streak_required=14),
    AchievementSeed("legend_track", "Legend Track", "Reach 500 points and 20 approved tasks.",
                    points_required=500, approved_tasks_required=20),
)


def ensure_base_achievements() -> None:
    existing = set(Achievement.objects.values_list("code", flat=True))
    to_create = [
        Achievement(
            code=seed.code,
            title=seed.title,
            description=seed.description,
            points_required=seed.points_required,
            streak_required=seed.streak_required,
            approved_tasks_required=seed.approved_tasks_required,
        )
        for seed in BASE_ACHIEVEMENTS
        if seed.code not in existing
    ]
    if to_create:
        Achievement.objects.bulk_create(to_create)


def assign_achievements_for_user(user: Any) -> list[str]:
    profile, _ = Profile.objects.get_or_create(user=user)
    approved_tasks = user.assigned_tasks.filter(
        status="approved", scope="project").count()

    unlocked_codes: list[str] = []
    achievements = Achievement.objects.all()
    for achievement in achievements:
        if profile.points < achievement.points_required:
            continue
        if profile.streak < achievement.streak_required:
            continue
        if approved_tasks < achievement.approved_tasks_required:
            continue

        _, created = UserAchievement.objects.get_or_create(
            user=user,
            achievement=achievement,
        )
        if created:
            unlocked_codes.append(achievement.code)

    return unlocked_codes


def get_user_achievements_payload(user: Any) -> list[dict[str, str | int]]:
    earned_map = {
        ua.achievement.pk: ua.earned_at
        for ua in UserAchievement.objects.filter(user=user).select_related("achievement")
    }

    payload: list[dict[str, str | int]] = []
    for achievement in Achievement.objects.all():
        earned_at = earned_map.get(achievement.pk)
        payload.append(
            {
                "code": achievement.code,
                "title": achievement.title,
                "description": achievement.description,
                "earned": int(earned_at is not None),
                "earned_at": earned_at.isoformat() if earned_at else "",
            }
        )

    return payload
