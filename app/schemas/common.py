from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampedModel(BaseModel):
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class DatabaseModel(TimestampedModel):
    id: str = Field(default_factory=lambda: str(uuid4()))


class APIResponse(BaseModel):
    success: bool = True
    message: str
    data: dict[str, Any] | list[Any] | None = None
