from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

client: AsyncIOMotorClient | None = None


def connect_to_mongo() -> AsyncIOMotorClient:
    global client
    if client is None:
        settings = get_settings()
        client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=settings.mongodb_server_selection_timeout_ms,
        )
    return client


def get_database() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return connect_to_mongo()[settings.mongodb_db]


async def close_mongo_connection() -> None:
    global client
    if client is not None:
        client.close()
        client = None
