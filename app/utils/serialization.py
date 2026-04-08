from __future__ import annotations

from typing import Any


def sanitize_mongo_document(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if document is None:
        return None
    sanitized = dict(document)
    sanitized.pop("_id", None)
    return sanitized
