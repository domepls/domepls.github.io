from django.urls import path

from .views import (
    FriendRequestActionAPIView,
    FriendRequestListAPIView,
    FriendsListAPIView,
    NotificationsListAPIView,
    NotificationsMarkReadAPIView,
    PublicProfileAPIView,
    RemoveFriendAPIView,
    SendFriendRequestAPIView,
    UserDirectoryAPIView,
)

urlpatterns = [
    path('directory/users/', UserDirectoryAPIView.as_view(), name='directory_users'),
    path('users/<str:username>/',
         PublicProfileAPIView.as_view(), name='public_profile'),

    path('friends/', FriendsListAPIView.as_view(), name='friends_list'),
    path('friends/requests/', FriendRequestListAPIView.as_view(),
         name='friend_requests'),
    path('friends/requests/send/', SendFriendRequestAPIView.as_view(),
         name='friend_request_send'),
    path(
        'friends/requests/<int:request_id>/<str:action>/',
        FriendRequestActionAPIView.as_view(),
        name='friend_request_action',
    ),
    path('friends/<str:username>/',
         RemoveFriendAPIView.as_view(), name='friend_remove'),

    path('notifications/', NotificationsListAPIView.as_view(),
         name='notifications_list'),
    path('notifications/mark-read/', NotificationsMarkReadAPIView.as_view(),
         name='notifications_mark_read'),
]
