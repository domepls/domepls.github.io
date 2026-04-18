from django.conf import settings
from django.db import models

from apps.projects.models import Project


class Chat(models.Model):
    class Type(models.TextChoices):
        DIRECT = 'direct', 'Direct'
        PROJECT = 'project', 'Project'

    type = models.CharField(max_length=16, choices=Type.choices)
    name = models.CharField(max_length=255, blank=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='chats',
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_chats',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)


class ChatMember(models.Model):
    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_memberships')
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('chat', 'user')
        ordering = ('-joined_at',)


class ChatMessage(models.Model):
    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at',)
