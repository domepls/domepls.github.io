from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "location", "points", "streak", "last_seen")
    search_fields = ("user__username", "user__email", "location")