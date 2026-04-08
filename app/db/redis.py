from __future__ import annotations

from redis.asyncio import Redis

from app.core.config import get_settings

client: Redis | None = None


def get_redis() -> Redis:
    global client
    if client is None:
        settings = get_settings()
        client = Redis.from_url(settings.redis_url, decode_responses=True)
    return client


async def close_redis_connection() -> None:
    global client
    if client is not None:
        await client.aclose()
        client = None
