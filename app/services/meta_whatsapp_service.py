from __future__ import annotations

import asyncio
import hashlib
import hmac
from typing import Any

import httpx

from app.core.config import get_settings


class MetaWhatsAppService:
    def __init__(self):
        self.settings = get_settings()

    def is_meta_webhook(self, payload: dict[str, Any]) -> bool:
        return payload.get("object") == "whatsapp_business_account" or "entry" in payload

    def validate_signature(self, raw_body: bytes, signature: str | None, app_secret: str) -> bool:
        if not signature or not app_secret:
            return False
        expected = hmac.new(app_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature.replace("sha256=", ""), expected)

    async def send_text_message(self, *, access_token: str, phone_number_id: str, to: str, body: str, preview_url: bool = False) -> dict[str, Any]:
        url = f"{self.settings.whatsapp_graph_url}/{self.settings.whatsapp_api_version}/{phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": body,
            },
        }
        return await self._post(url, access_token, payload)

    async def send_template_message(
        self,
        *,
        access_token: str,
        phone_number_id: str,
        to: str,
        template_name: str,
        language_code: str = "pt_BR",
        body_parameters: list[str] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.settings.whatsapp_graph_url}/{self.settings.whatsapp_api_version}/{phone_number_id}/messages"
        components: list[dict[str, Any]] = []
        if body_parameters:
            components.append(
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": value} for value in body_parameters],
                }
            )

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components,
            },
        }
        return await self._post(url, access_token, payload)

    async def _post(self, url: str, access_token: str, payload: dict[str, Any]) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(1, self.settings.provider_send_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.settings.whatsapp_request_timeout_seconds) as client:
                    response = await client.post(
                        url,
                        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                        json=payload,
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
