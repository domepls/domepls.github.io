from django.contrib import admin

from .models import Chat, ChatMember, ChatMessage


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'name', 'project',
                    'created_by', 'updated_at')
    list_filter = ('type',)


@admin.register(ChatMember)
class ChatMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat', 'user', 'joined_at')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat', 'sender', 'created_at')
    search_fields = ('text',)
