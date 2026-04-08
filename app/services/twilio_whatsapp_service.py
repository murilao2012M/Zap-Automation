from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
from typing import Any

import httpx
from app.core.config import get_settings


class TwilioWhatsAppService:
    TWILIO_API_BASE = "https://api.twilio.com/2010-04-01"

    def __init__(self) -> None:
        self.settings = get_settings()

    async def send_text_message(
        self,
        *,
        account_sid: str,
        auth_token: str,
        from_number: str,
        to_number: str,
        body: str,
    ) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(1, self.settings.provider_send_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=20) as client:
                    response = await client.post(
                        f"{self.TWILIO_API_BASE}/Accounts/{account_sid}/Messages.json",
                        auth=(account_sid, auth_token),
                        data={
                            "From": self._format_whatsapp_number(from_number),
                            "To": self._format_whatsapp_number(to_number),
                            "Body": body,
                        },
                    )
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt >= self.settings.provider_send_retries:
                    raise
                await asyncio.sleep(self.settings.provider_retry_backoff_ms / 1000)
        if last_error:
            raise last_error
        return {}

    @staticmethod
    def is_twilio_webhook(payload: dict[str, Any]) -> bool:
        return "Body" in payload and "From" in payload

    @staticmethod
    def validate_signature(url: str, form_payload: dict[str, Any], signature: str | None, auth_token: str) -> bool:
        if not signature or not auth_token:
            return False

        expected_payload = url + "".join(str(form_payload[key]) for key in sorted(form_payload))
        digest = hmac.new(auth_token.encode("utf-8"), expected_payload.encode("utf-8"), hashlib.sha1).digest()
        expected_signature = base64.b64encode(digest).decode("utf-8")
        return hmac.compare_digest(signature, expected_signature)

    @staticmethod
    def _format_whatsapp_number(value: str) -> str:
        return value if value.startswith("whatsapp:") else f"whatsapp:{value}"
