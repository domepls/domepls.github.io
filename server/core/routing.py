from channels.routing import URLRouter

from apps.chats.routing import websocket_urlpatterns as chats_websocket_urlpatterns
from apps.social.routing import websocket_urlpatterns as social_websocket_urlpatterns

application = URLRouter([
    *chats_websocket_urlpatterns,
    *social_websocket_urlpatterns,
])
