from django.contrib.auth import get_user_model
from django.db.models import Q
from html import escape
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.social.models import Friendship, Notification
from apps.social.services import create_notification, user_link
from .models import Chat, ChatMember, ChatMessage
from .serializers import ChatMessageSerializer, ChatSerializer

User = get_user_model()


def _are_friends(user_a_id: int, user_b_id: int) -> bool:
    low, high = sorted([user_a_id, user_b_id])
    return Friendship.objects.filter(user1_id=low, user2_id=high).exists()


class ChatsListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        chats = (
            Chat.objects.filter(memberships__user=request.user)
            .prefetch_related('memberships__user', 'messages__sender')
            .select_related('project')
            .distinct()
            .order_by('-updated_at')
        )
        return Response(ChatSerializer(chats, many=True).data)


class StartDirectChatAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        username = str(request.data.get('username', '')).strip()
        target = User.objects.filter(username=username).first()
        if not target:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target.id == request.user.id:
            return Response({'detail': 'Cannot chat with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        if not _are_friends(request.user.id, target.id):
            return Response({'detail': 'Direct chats are allowed only with friends.'}, status=status.HTTP_403_FORBIDDEN)

        candidate = (
            Chat.objects.filter(type=Chat.Type.DIRECT)
            .filter(memberships__user=request.user)
            .filter(memberships__user=target)
            .distinct()
            .first()
        )

        if candidate:
            return Response(ChatSerializer(candidate).data)

        chat = Chat.objects.create(
            type=Chat.Type.DIRECT, created_by=request.user, name='')
        ChatMember.objects.bulk_create([
            ChatMember(chat=chat, user=request.user),
            ChatMember(chat=chat, user=target),
        ])

        return Response(ChatSerializer(chat).data, status=status.HTTP_201_CREATED)


class OpenProjectChatAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id: int):
        project = Project.objects.filter(id=project_id).first()
        if not project:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_member = project.owner_id == request.user.id or project.members.filter(
            id=request.user.id).exists()
        if not is_member:
            return Response({'detail': 'No access to this project.'}, status=status.HTTP_403_FORBIDDEN)

        chat = Chat.objects.filter(
            type=Chat.Type.PROJECT, project=project).first()
        if not chat:
            chat = Chat.objects.create(
                type=Chat.Type.PROJECT,
                project=project,
                name=project.name,
                created_by=request.user,
            )

        member_ids = list(project.members.values_list('id', flat=True))
        member_ids.append(project.owner_id)
        member_ids = sorted(set(member_ids))

        existing_ids = set(ChatMember.objects.filter(
            chat=chat).values_list('user_id', flat=True))
        to_create = [
            ChatMember(chat=chat, user_id=user_id)
            for user_id in member_ids
            if user_id not in existing_ids
        ]
        if to_create:
            ChatMember.objects.bulk_create(to_create)

        return Response(ChatSerializer(chat).data)


class ChatMessagesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id: int):
        membership_exists = ChatMember.objects.filter(
            chat_id=chat_id, user=request.user).exists()
        if not membership_exists:
            return Response({'detail': 'No access to this chat.'}, status=status.HTTP_403_FORBIDDEN)

        messages = ChatMessage.objects.filter(chat_id=chat_id).select_related(
            'sender').order_by('-created_at')[:50]
        return Response(ChatMessageSerializer(list(reversed(messages)), many=True).data)


def notify_chat_message(chat: Chat, sender, text: str):
    memberships = ChatMember.objects.select_related(
        'user__profile').filter(chat=chat).exclude(user=sender)

    for membership in memberships:
        chat_title = chat.name if chat.type == Chat.Type.PROJECT else 'Direct chat'
        create_notification(
            recipient=membership.user,
            actor=sender,
            notification_type=Notification.Type.CHAT_MESSAGE,
            title='New chat message',
            body=(
                f"{user_link(sender.username)}: {escape(text[:120])}"
            ),
            data={
                'chat_id': chat.id,
                'target_path': f'/app/chats?chatId={chat.id}',
                'chat_name': chat_title,
                'profile_path': f'/app/users/{sender.username}',
            },
            send_telegram=True,
        )
