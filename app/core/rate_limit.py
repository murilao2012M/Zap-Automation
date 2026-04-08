from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings


class SimpleRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        settings = get_settings()
        self.max_requests = settings.rate_limit_requests
        self.window_seconds = settings.rate_limit_window_seconds
        self.auth_max_requests = settings.auth_rate_limit_requests
        self.auth_window_seconds = settings.auth_rate_limit_window_seconds
        self.webhook_max_requests = settings.webhook_rate_limit_requests
        self.webhook_window_seconds = settings.webhook_rate_limit_window_seconds
        self.requests: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        client_host = self._get_client_host(request)
        limit, window = self._resolve_limits(request)
        key = f"{client_host}:{request.url.path}"
        current_time = time.time()
        bucket = self.requests[key]

        while bucket and current_time - bucket[0] > window:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(window - (current_time - bucket[0])))
            response = JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Limite de requisicoes excedido",
                    "data": None,
                },
            )
            response.headers["Retry-After"] = str(retry_after)
            return response

        bucket.append(current_time)
        return await call_next(request)

    @staticmethod
    def _get_client_host(request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "unknown"

    def _resolve_limits(self, request: Request) -> tuple[int, int]:
        path = request.url.path
        if "/auth/login" in path or "/auth/signup" in path or "/auth/register" in path:
            return self.auth_max_requests, self.auth_window_seconds
        if "/webhook/" in path:
            return self.webhook_max_requests, self.webhook_window_seconds
        return self.max_requests, self.window_seconds
