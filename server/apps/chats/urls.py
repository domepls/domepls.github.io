from django.urls import path

from .views import (
    ChatMessagesAPIView,
    ChatsListAPIView,
    OpenProjectChatAPIView,
    StartDirectChatAPIView,
)

urlpatterns = [
    path('chats/', ChatsListAPIView.as_view(), name='chats_list'),
    path('chats/direct/start/', StartDirectChatAPIView.as_view(),
         name='chats_direct_start'),
    path('chats/project/<int:project_id>/open/',
         OpenProjectChatAPIView.as_view(), name='chats_project_open'),
    path('chats/<int:chat_id>/messages/',
         ChatMessagesAPIView.as_view(), name='chats_messages'),
]
