from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        token = self._get_token()
        if not token:
            await self.close(code=4401)
            return

        user = await self._get_user_from_token(token)
        if not user:
            await self.close(code=4401)
            return

        self.user = user
        self.group_name = f'notifications_{user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_event(self, event):
        await self.send_json(event['payload'])

    def _get_token(self):
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        parsed = parse_qs(query_string)
        return parsed.get('token', [None])[0]

    @sync_to_async
    def _get_user_from_token(self, token):
        try:
            access = AccessToken(token)
            user_id = access.get('user_id')
            if not user_id:
                return None
            return User.objects.filter(id=user_id).first()
        except Exception:
            return None
