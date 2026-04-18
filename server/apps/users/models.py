from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    avatar = models.ImageField(upload_to='pfps/', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    birth_date = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)

    status = models.CharField(
        max_length=255, blank=True, default="Hey there! I'm using DoMePls.")
    points = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    last_seen = models.DateTimeField(auto_now=True)
    two_factor_enabled = models.BooleanField(default=False)

    telegram_id = models.BigIntegerField(blank=True, null=True, unique=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


class Achievement(models.Model):
    code = models.SlugField(max_length=64, unique=True)
    title = models.CharField(max_length=120)
    description = models.TextField()
    points_required = models.PositiveIntegerField(default=0)
    streak_required = models.PositiveIntegerField(default=0)
    approved_tasks_required = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return self.title


class UserAchievement(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="earned_achievements",
    )
    achievement = models.ForeignKey(
        Achievement,
        on_delete=models.CASCADE,
        related_name="earned_by",
    )
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "achievement")
        ordering = ("-earned_at",)

    def __str__(self):
        return f"{self.user.username}: {self.achievement.title}"
