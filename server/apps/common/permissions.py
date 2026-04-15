from rest_framework.permissions import IsAuthenticated


class IsTelegramLinked(IsAuthenticated):
    message = "Telegram account must be connected."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        profile = getattr(request.user, "profile", None)
        return bool(profile and profile.telegram_id)
