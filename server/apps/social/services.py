from django.contrib.auth import get_user_model
from django.conf import settings
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from html import escape
from urllib.parse import quote, urljoin

from apps.users.models import Profile
from .models import Notification
from .telegram import send_telegram_message
from .serializers import NotificationSerializer

User = get_user_model()


def build_site_url(path: str) -> str:
    base_url = getattr(settings, 'FRONTEND_URL',
                       'https://domepls.onrender.com')
    normalized_path = path if path.startswith('/') else f'/{path}'
    return urljoin(base_url.rstrip('/') + '/', normalized_path.lstrip('/'))


def build_profile_url(username: str) -> str:
    cleaned = quote(username.strip())
    return build_site_url(f'/app/users/{cleaned}')


def build_project_url(project_id: int) -> str:
    return build_site_url(f'/app/projects/{project_id}')


def build_task_url(task_id: int) -> str:
    return build_site_url(f'/app/tasks?taskId={task_id}')


def build_chat_url(chat_id: int) -> str:
    return build_site_url(f'/app/chats?chatId={chat_id}')


def user_link(username: str, label: str | None = None) -> str:
    clean_username = username.strip()
    text = label or f'@{clean_username}'
    return f'<a href="{escape(build_profile_url(clean_username), quote=True)}">{escape(text)}</a>'


def project_link(project_name: str, project_id: int) -> str:
    return f'<a href="{escape(build_project_url(project_id), quote=True)}">{escape(project_name)}</a>'


def task_link(task_title: str, task_id: int) -> str:
    return f'<a href="{escape(build_task_url(task_id), quote=True)}">{escape(task_title)}</a>'


def chat_link(chat_name: str, chat_id: int) -> str:
    title = chat_name.strip() or f'Chat #{chat_id}'
    return f'<a href="{escape(build_chat_url(chat_id), quote=True)}">{escape(title)}</a>'


def create_notification(
    *,
    recipient,
    title: str,
    body: str,
    notification_type: str = Notification.Type.SYSTEM,
    actor=None,
    data: dict | None = None,
    send_telegram: bool = True,
):
    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        type=notification_type,
        title=title,
        body=body,
        data=data or {},
    )

    if send_telegram:
        profile = Profile.objects.filter(user_id=recipient.id).first()
        if profile and profile.telegram_id:
            message = f'<b>{escape(title)}</b>'
            if body:
                message += f'\n{body}'
            send_telegram_message(int(profile.telegram_id), message)

    channel_layer = get_channel_layer()
    if channel_layer:
        unread_count = Notification.objects.filter(
            recipient=recipient,
            is_read=False,
        ).count()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{recipient.id}',
            {
                'type': 'notification.event',
                'payload': {
                    'notification': NotificationSerializer(notification).data,
                    'unread_count': unread_count,
                },
            },
        )

    return notification
