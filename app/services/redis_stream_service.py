from __future__ import annotations

import json
import logging
from collections.abc import Callable
from typing import Any

from redis.exceptions import ResponseError

from app.core.config import get_settings
from app.db.redis import get_redis

logger = logging.getLogger("zap_automation")


class RedisStreamService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.redis = get_redis()

    @property
    def enabled(self) -> bool:
        return self.settings.redis_stream_enabled

    async def publish(self, *, event_type: str, payload: dict[str, Any], attempts: int = 0) -> str | None:
        if not self.enabled:
            return None

        fields = {
            "event_type": event_type,
            "payload": json.dumps(payload, ensure_ascii=False),
            "attempts": str(attempts),
        }
        return await self.redis.xadd(
            self.settings.redis_stream_key,
            fields,
            maxlen=self.settings.redis_stream_maxlen,
            approximate=True,
        )

    async def publish_dead_letter(self, *, event_type: str, payload: dict[str, Any], attempts: int, reason: str) -> str | None:
        if not self.enabled:
            return None

        return await self.redis.xadd(
            self.settings.redis_dead_letter_key,
            {
                "event_type": event_type,
                "payload": json.dumps(payload, ensure_ascii=False),
                "attempts": str(attempts),
                "reason": reason,
            },
            maxlen=self.settings.redis_stream_maxlen,
            approximate=True,
        )

    async def ensure_group(self) -> None:
        if not self.enabled:
            return
        try:
            await self.redis.xgroup_create(
                name=self.settings.redis_stream_key,
                groupname=self.settings.redis_stream_group,
                id="0",
                mkstream=True,
            )
        except ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    async def consume(
        self,
        *,
        consumer_name: str | None = None,
        handler: Callable[[str, dict[str, Any]], Any],
    ) -> None:
        if not self.enabled:
            return

        consumer = consumer_name or self.settings.redis_stream_consumer_name
        await self.ensure_group()

        while True:
            entries = await self.redis.xreadgroup(
                groupname=self.settings.redis_stream_group,
                consumername=consumer,
                streams={self.settings.redis_stream_key: ">"},
                count=self.settings.redis_stream_batch_size,
                block=self.settings.redis_stream_block_ms,
            )
            if not entries:
                continue

            for _, messages in entries:
                for message_id, values in messages:
                    try:
                        event_type = values["event_type"]
                        payload = json.loads(values["payload"])
                        attempts = int(values.get("attempts", "0"))
                        await handler(event_type, payload)
                        await self.redis.xack(
                            self.settings.redis_stream_key,
                            self.settings.redis_stream_group,
                            message_id,
                        )
                    except Exception as exc:
                        logger.exception("redis_stream_event_failed id=%s attempts=%s", message_id, values.get("attempts", "0"))
                        next_attempt = attempts + 1
                        await self.redis.xack(
                            self.settings.redis_stream_key,
                            self.settings.redis_stream_group,
                            message_id,
                        )
                        if next_attempt >= self.settings.redis_stream_max_attempts:
                            await self.publish_dead_letter(
                                event_type=values.get("event_type", "unknown"),
                                payload=json.loads(values.get("payload", "{}")),
                                attempts=next_attempt,
                                reason=str(exc),
                            )
                        else:
                            await self.publish(
                                event_type=values.get("event_type", "unknown"),
                                payload=json.loads(values.get("payload", "{}")),
                                attempts=next_attempt,
                            )
