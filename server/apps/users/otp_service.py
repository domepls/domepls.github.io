import json
import logging
import secrets
from dataclasses import dataclass
from typing import Final
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import redis
from django.conf import settings

from .models import Profile

logger = logging.getLogger(__name__)

LOGIN_SCOPE: Final[str] = "login_2fa"
DELETE_ACCOUNT_SCOPE: Final[str] = "delete_account"


@dataclass(frozen=True)
class OtpIssueResult:
    code: str
    ttl_seconds: int


_redis_client: redis.Redis | None = None


def _get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _redis_key(scope: str, user_id: int) -> str:
    return f"auth:otp:{scope}:{user_id}"


def issue_otp(scope: str, user_id: int) -> OtpIssueResult:
    code = f"{secrets.randbelow(1_000_000):06d}"
    ttl_seconds = max(int(getattr(settings, "AUTH_CODE_TTL_SECONDS", 300)), 60)
    key = _redis_key(scope, user_id)
    _get_redis_client().setex(key, ttl_seconds, code)
    return OtpIssueResult(code=code, ttl_seconds=ttl_seconds)


def verify_otp(scope: str, user_id: int, code: str, *, consume: bool = True) -> bool:
    normalized_code = code.strip()
    if not normalized_code:
        return False

    key = _redis_key(scope, user_id)
    stored_code = _get_redis_client().get(key)
    if not stored_code:
        return False

    is_valid = secrets.compare_digest(
        stored_code, normalized_code)  # type: ignore
    if is_valid and consume:
        _get_redis_client().delete(key)

    return is_valid


def send_telegram_code(profile: Profile, *, scope: str, code: str, ttl_seconds: int) -> None:
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise ValueError("Telegram bot token is not configured.")

    if not profile.telegram_id:
        raise ValueError("Telegram is not connected for this account.")

    message_by_scope = {
        LOGIN_SCOPE: "Your login verification code",
        DELETE_ACCOUNT_SCOPE: "Your account deletion code",
    }
    caption = message_by_scope.get(scope, "Your verification code")

    text = (
        f"{caption}: <code>{code}</code>\n"
        f"Code expires in {max(ttl_seconds // 60, 1)} minute(s).\n"
        "If this wasn't you, ignore this message."
    )

    payload = urlencode(
        {
            "chat_id": str(profile.telegram_id),
            "text": text,
            "disable_web_page_preview": "true",
        }
    ).encode("utf-8")

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage?parse_mode=HTML"
    request = Request(url, data=payload, headers={
                      "Content-Type": "application/x-www-form-urlencoded"})

    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8")
            parsed = json.loads(body)
            if not parsed.get("ok"):
                raise ValueError("Telegram API rejected the message.")
    except (URLError, TimeoutError, ValueError) as error:
        logger.warning(
            "Failed to send Telegram OTP for user_id=%s, scope=%s: %s",
            profile.user_id,  # type: ignore
            scope,
            error,
        )
        raise ValueError(
            "Unable to send verification code to Telegram.") from error
