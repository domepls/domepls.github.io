from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from .models import Chat, ChatMember, ChatMessage
from .serializers import ChatMessageSerializer
from .views import notify_chat_message

User = get_user_model()


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.chat_id = int(self.scope['url_route']['kwargs']['chat_id'])
        self.group_name = f'chat_{self.chat_id}'

        token = self._get_token()
        if not token:
            await self.close(code=4401)
            return

        user = await self._get_user_from_token(token)
        if not user:
            await self.close(code=4401)
            return

        self.user = user
        has_access = await self._has_chat_access(user.id, self.chat_id)
        if not has_access:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        text = str(content.get('text', '')).strip()
        if not text:
            return

        message = await self._create_message(self.chat_id, self.user.id, text)

        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat.message',
                'payload': message,
            },
        )

        await self._touch_chat(self.chat_id)

    async def chat_message(self, event):
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

    @sync_to_async
    def _has_chat_access(self, user_id: int, chat_id: int) -> bool:
        return ChatMember.objects.filter(chat_id=chat_id, user_id=user_id).exists()

    @sync_to_async
    def _create_message(self, chat_id: int, user_id: int, text: str):
        message = ChatMessage.objects.create(
            chat_id=chat_id, sender_id=user_id, text=text)
        message = ChatMessage.objects.select_related(
            'sender').get(id=message.id)

        chat = Chat.objects.get(id=chat_id)
        sender = User.objects.get(id=user_id)
        notify_chat_message(chat, sender, text)

        return ChatMessageSerializer(message).data

    @sync_to_async
    def _touch_chat(self, chat_id: int):
        Chat.objects.filter(id=chat_id).update(updated_at=timezone.now())
