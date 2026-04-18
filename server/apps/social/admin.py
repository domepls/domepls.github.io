from django.contrib import admin

from .models import FriendRequest, Friendship, Notification


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1', 'user2', 'created_at')
    search_fields = ('user1__username', 'user2__username')


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_user', 'to_user', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('from_user__username', 'to_user__username')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'type',
                    'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
    search_fields = ('recipient__username', 'actor__username', 'title')
