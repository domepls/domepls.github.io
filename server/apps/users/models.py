from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    avatar = models.ImageField(upload_to='pfps/',blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    birth_date = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)

    status = models.CharField(max_length=255, blank=True, default="pls do me 👉👈")
    points = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    last_seen = models.DateTimeField(auto_now=True)

    telegram_id = models.BigIntegerField(blank=True, null=True, unique=True)
    

    def __str__(self):
        return f"Profile of {self.user.username}"