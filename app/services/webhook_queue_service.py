from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.config import get_settings
from app.db.mongo import get_database
from app.schemas.messaging import WhatsAppWebhookPayload
from app.services.message_service import MessageService
from app.services.redis_stream_service import RedisStreamService

logger = logging.getLogger("zap_automation")


class WebhookQueueService:
    def __init__(self, db=None) -> None:
        self.db = db if db is not None else get_database()
        self.settings = get_settings()
        self.stream_service = RedisStreamService()

    @property
    def enabled(self) -> bool:
        return self.settings.redis_stream_enabled

    async def enqueue_incoming_message(self, payload: WhatsAppWebhookPayload) -> str | None:
        return await self.stream_service.publish(
            event_type="incoming_message",
            payload=payload.model_dump(),
        )

    async def enqueue_meta_webhook(self, payload: dict[str, Any]) -> str | None:
        return await self.stream_service.publish(event_type="meta_webhook", payload=payload)

    async def enqueue_twilio_webhook(self, payload: dict[str, Any]) -> str | None:
        return await self.stream_service.publish(event_type="twilio_webhook", payload=payload)

    async def handle_event(self, event_type: str, payload: dict[str, Any]) -> None:
        service = MessageService(self.db)
        if event_type == "incoming_message":
            await service.process_incoming_message(WhatsAppWebhookPayload.model_validate(payload))
            return
        if event_type == "meta_webhook":
            await service.process_meta_webhook_event(payload)
            return
        if event_type == "twilio_webhook":
            await service.process_twilio_webhook_event(payload)
            return
        logger.warning("redis_stream_unknown_event_type type=%s", event_type)

    async def run_consumer(self) -> None:
        if not self.enabled or not self.settings.redis_stream_consumer_enabled:
            return

        logger.info(
            "redis_stream_consumer_started stream=%s group=%s consumer=%s",
            self.settings.redis_stream_key,
            self.settings.redis_stream_group,
            self.settings.redis_stream_consumer_name,
        )
        try:
            await self.stream_service.consume(
                consumer_name=self.settings.redis_stream_consumer_name,
                handler=self.handle_event,
            )
        except asyncio.CancelledError:
            logger.info("redis_stream_consumer_stopped")
            raise
