from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.users.models import Profile
from .models import Notification
from .telegram import send_telegram_message
from .serializers import NotificationSerializer

User = get_user_model()


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
            message = f'<b>{title}</b>'
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
