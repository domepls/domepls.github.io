import hashlib
import hmac
import secrets

from django.conf import settings


REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/"
REFRESH_COOKIE_SAMESITE = "Lax"
REFRESH_COOKIE_SECURE = not settings.DEBUG


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=REFRESH_COOKIE_SECURE,
        samesite=REFRESH_COOKIE_SAMESITE,
        path=REFRESH_COOKIE_PATH,
        max_age=int(
            settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
    )


def clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


def get_refresh_token_from_request(request):
    return request.COOKIES.get(REFRESH_COOKIE_NAME)


def generate_telegram_state():
    return secrets.token_urlsafe(32)


def validate_telegram_auth_payload(payload):
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not configured.")

    received_hash = payload.get("hash")
    if not received_hash:
        raise ValueError("Telegram hash is missing.")

    auth_date = int(payload.get("auth_date", 0))
    if auth_date <= 0:
        raise ValueError("Telegram auth_date is invalid.")

    expected_age = 300
    now = int(__import__("time").time())
    if now - auth_date > expected_age:
        raise ValueError("Telegram authentication request expired.")

    data_check_pairs = []
    for key in sorted(payload):
        if key == "hash":
            continue
        value = payload.get(key)
        if value is None:
            continue
        data_check_pairs.append(f"{key}={value}")

    data_check_string = "\n".join(data_check_pairs)
    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    expected_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("Invalid Telegram authentication hash.")
