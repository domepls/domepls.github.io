import json
import logging
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError

from django.conf import settings

logger = logging.getLogger(__name__)


def send_telegram_message(chat_id: int, text: str) -> None:
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not bot_token or not chat_id or not text.strip():
        return

    payload = urlencode(
        {
            'chat_id': str(chat_id),
            'text': text,
            'disable_web_page_preview': 'true',
        }
    ).encode('utf-8')

    url = f'https://api.telegram.org/bot{bot_token}/sendMessage?parse_mode=HTML'
    request = Request(url, data=payload, headers={
                      'Content-Type': 'application/x-www-form-urlencoded'})

    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode('utf-8')
            parsed = json.loads(body)
            if not parsed.get('ok'):
                logger.warning(
                    'Telegram API rejected message for chat_id=%s', chat_id)
    except (URLError, TimeoutError, ValueError) as error:
        logger.warning(
            'Failed to send Telegram notification to chat_id=%s: %s', chat_id, error)
