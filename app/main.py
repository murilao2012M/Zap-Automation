from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError
import sentry_sdk
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.routes_admin import router as admin_router
from app.api.routes_automation import router as automation_router
from app.api.routes_auth import router as auth_router
from app.api.routes_catalog import router as catalog_router
from app.api.routes_webhook import router as webhook_router
from app.core.config import get_settings
from app.core.rate_limit import SimpleRateLimitMiddleware
from app.db.mongo import close_mongo_connection, connect_to_mongo, get_database
from app.db.redis import close_redis_connection, get_redis
from app.schemas.common import APIResponse
from app.services.bootstrap_service import BootstrapService
from app.services.webhook_queue_service import WebhookQueueService

logger = logging.getLogger("zap_automation")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = get_database()
    bootstrap = BootstrapService(db)
    try:
        await bootstrap.seed()
    except PyMongoError as exc:
        logger.warning("mongo_startup_unavailable detail=%s", exc)
    queue_service = WebhookQueueService(db)
    consumer_task = None
    if queue_service.enabled and settings.redis_stream_consumer_enabled:
        consumer_task = asyncio.create_task(queue_service.run_consumer())
    yield
    if consumer_task is not None:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    await close_redis_connection()
    await close_mongo_connection()


settings = get_settings()

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        send_default_pii=settings.sentry_send_default_pii,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profile_session_sample_rate=settings.sentry_profiles_sample_rate,
        profile_lifecycle="trace" if settings.sentry_profiles_sample_rate > 0 else None,
        enable_logs=settings.sentry_enable_logs,
    )

app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list or ["*"])
app.add_middleware(SimpleRateLimitMiddleware)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(catalog_router, prefix=settings.api_prefix)
app.include_router(webhook_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(automation_router, prefix=settings.api_prefix)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            parsed_length = int(content_length)
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Cabecalho Content-Length invalido", "data": None},
            )
        if parsed_length > settings.max_request_body_bytes:
            return JSONResponse(
                status_code=413,
                content={"success": False, "message": "Corpo da requisicao excede o limite permitido", "data": None},
            )

    logger.info("request_started method=%s path=%s", request.method, request.url.path)
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    logger.info("request_finished method=%s path=%s status=%s", request.method, request.url.path, response.status_code)
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_exception path=%s", request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Erro interno do servidor", "data": None},
    )


@app.exception_handler(PyMongoError)
async def mongo_exception_handler(request: Request, exc: PyMongoError):
    logger.warning("mongo_request_unavailable path=%s detail=%s", request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "message": "Banco de dados temporariamente indisponivel. Tente novamente em instantes.",
            "data": None,
        },
    )


@app.get("/", response_model=APIResponse)
async def healthcheck():
    return APIResponse(
        message="Zap Automation API online",
        data={
            "environment": settings.app_env,
            "docs": "/docs",
            "api_prefix": settings.api_prefix,
        },
    )


@app.get("/healthz")
async def liveness_check():
    return {
        "success": True,
        "message": "Servico ativo",
        "data": {
            "environment": settings.app_env,
            "service": settings.app_name,
        },
    }


@app.get("/readyz")
async def readiness_check():
    checks = {
        "application": "ok",
        "mongo": "pending",
        "redis": "pending",
    }
    status_code = 200

    try:
        await connect_to_mongo().admin.command("ping")
        checks["mongo"] = "ok"
    except Exception as exc:  # pragma: no cover - readiness path
        checks["mongo"] = f"error:{type(exc).__name__}"
        status_code = 503

    try:
        await get_redis().ping()
        checks["redis"] = "ok"
    except Exception as exc:  # pragma: no cover - readiness path
        checks["redis"] = f"error:{type(exc).__name__}"
        status_code = 503

    return JSONResponse(
        status_code=status_code,
        content={
            "success": status_code == 200,
            "message": "Servico pronto" if status_code == 200 else "Dependencias indisponiveis",
            "data": checks,
        },
    )
