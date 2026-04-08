from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class AuditService:
    def __init__(self, db):
        self.db = db

    async def record(
        self,
        *,
        tenant_id: str,
        actor_id: str | None,
        actor_email: str | None,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        detail: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        await self.db.audit_events.insert_one(
            {
                "tenant_id": tenant_id,
                "actor_id": actor_id,
                "actor_email": actor_email,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "detail": detail,
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc),
            }
        )
