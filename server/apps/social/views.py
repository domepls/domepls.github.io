from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FriendRequest, Friendship, Notification
from .serializers import FriendRequestSerializer, NotificationSerializer, PublicUserSerializer
from .services import create_notification

User = get_user_model()


def _friendship_exists(user_a_id: int, user_b_id: int) -> bool:
    low, high = sorted([user_a_id, user_b_id])
    return Friendship.objects.filter(user1_id=low, user2_id=high).exists()


class UserDirectoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])

        users = (
            User.objects.select_related('profile')
            .exclude(id=request.user.id)
            .filter(
                Q(username__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
            )
            .order_by('username')[:20]
        )

        return Response(PublicUserSerializer(users, many=True).data)


class PublicProfileAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username: str):
        user = User.objects.select_related(
            'profile').filter(username=username).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        payload = PublicUserSerializer(user).data
        payload['is_self'] = user.id == request.user.id
        payload['is_friend'] = _friendship_exists(
            request.user.id, user.id) if user.id != request.user.id else False
        pending_request = FriendRequest.objects.filter(
            from_user=request.user,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        ).first()
        payload['outgoing_request_id'] = pending_request.id if pending_request else None
        return Response(payload)


class FriendsListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        friendships = Friendship.objects.select_related('user1__profile', 'user2__profile').filter(
            Q(user1=request.user) | Q(user2=request.user)
        )

        friends = []
        for rel in friendships:
            friend = rel.user2 if rel.user1_id == request.user.id else rel.user1
            friends.append(friend)

        friends.sort(key=lambda u: u.username.lower())
        return Response(PublicUserSerializer(friends, many=True).data)


class FriendRequestListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        incoming = FriendRequest.objects.select_related('from_user__profile', 'to_user__profile').filter(
            to_user=request.user,
            status=FriendRequest.Status.PENDING,
        )
        outgoing = FriendRequest.objects.select_related('from_user__profile', 'to_user__profile').filter(
            from_user=request.user,
            status=FriendRequest.Status.PENDING,
        )

        return Response(
            {
                'incoming': FriendRequestSerializer(incoming, many=True).data,
                'outgoing': FriendRequestSerializer(outgoing, many=True).data,
            }
        )


class SendFriendRequestAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        username = str(request.data.get('username', '')).strip()
        if not username:
            return Response({'detail': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        target = User.objects.select_related(
            'profile').filter(username=username).first()
        if not target:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target.id == request.user.id:
            return Response({'detail': 'You cannot add yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        if _friendship_exists(request.user.id, target.id):
            return Response({'detail': 'You are already friends.'}, status=status.HTTP_409_CONFLICT)

        existing = FriendRequest.objects.filter(
            from_user=request.user,
            to_user=target,
            status=FriendRequest.Status.PENDING,
        ).first()
        if existing:
            return Response({'detail': 'Friend request already sent.'}, status=status.HTTP_409_CONFLICT)

        mirrored = FriendRequest.objects.filter(
            from_user=target,
            to_user=request.user,
            status=FriendRequest.Status.PENDING,
        ).first()
        if mirrored:
            return Response({'detail': 'This user already sent you a request.'}, status=status.HTTP_409_CONFLICT)

        friend_request = FriendRequest.objects.create(
            from_user=request.user, to_user=target)

        create_notification(
            recipient=target,
            actor=request.user,
            notification_type=Notification.Type.FRIEND_REQUEST,
            title='New friend request',
            body=f'<i>{request.user.username}</i> sent you a friend request.',
            data={'request_id': friend_request.id,
                  'from_username': request.user.username},
            send_telegram=True,
        )

        return Response(FriendRequestSerializer(friend_request).data, status=status.HTTP_201_CREATED)


class FriendRequestActionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, request_id: int, action: str):
        friend_request = FriendRequest.objects.select_related(
            'from_user__profile', 'to_user__profile').filter(id=request_id).first()
        if not friend_request:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if friend_request.status != FriendRequest.Status.PENDING:
            return Response({'detail': 'This request is already resolved.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'accept':
            if friend_request.to_user_id != request.user.id:
                return Response({'detail': 'You cannot accept this request.'}, status=status.HTTP_403_FORBIDDEN)

            friend_request.status = FriendRequest.Status.ACCEPTED
            friend_request.save(update_fields=['status', 'updated_at'])

            low, high = sorted(
                [friend_request.from_user_id, friend_request.to_user_id])
            Friendship.objects.get_or_create(user1_id=low, user2_id=high)

            create_notification(
                recipient=friend_request.from_user,
                actor=request.user,
                notification_type=Notification.Type.FRIEND_ACCEPTED,
                title='Friend request accepted',
                body=f'<i>{request.user.username}</i> accepted your friend request.',
                data={'username': request.user.username},
                send_telegram=True,
            )

            return Response(FriendRequestSerializer(friend_request).data)

        if action == 'reject':
            if friend_request.to_user_id != request.user.id:
                return Response({'detail': 'You cannot reject this request.'}, status=status.HTTP_403_FORBIDDEN)
            friend_request.status = FriendRequest.Status.REJECTED
            friend_request.save(update_fields=['status', 'updated_at'])
            return Response(FriendRequestSerializer(friend_request).data)

        if action == 'cancel':
            if friend_request.from_user_id != request.user.id:
                return Response({'detail': 'You cannot cancel this request.'}, status=status.HTTP_403_FORBIDDEN)
            friend_request.status = FriendRequest.Status.CANCELLED
            friend_request.save(update_fields=['status', 'updated_at'])
            return Response(FriendRequestSerializer(friend_request).data)

        return Response({'detail': 'Unsupported action.'}, status=status.HTTP_400_BAD_REQUEST)


class RemoveFriendAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, username: str):
        target = User.objects.filter(username=username).first()
        if not target:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        low, high = sorted([request.user.id, target.id])
        deleted, _ = Friendship.objects.filter(
            user1_id=low, user2_id=high).delete()
        if not deleted:
            return Response({'detail': 'Friendship not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationsListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.select_related(
            'actor__profile').filter(recipient=request.user)[:30]
        unread_count = Notification.objects.filter(
            recipient=request.user, is_read=False).count()
        return Response(
            {
                'items': NotificationSerializer(notifications, many=True).data,
                'unread_count': unread_count,
            }
        )


class NotificationsMarkReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        notification_id = request.data.get('notification_id')
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        if notification_id:
            qs = qs.filter(id=notification_id)
        qs.update(is_read=True)
        return Response({'detail': 'Notifications updated.'})
