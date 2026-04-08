from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from app.api.deps import get_db
from app.core.config import get_settings
from app.schemas.common import APIResponse
from app.schemas.messaging import LocalMetaWebhookSimulationRequest, WhatsAppWebhookPayload
from app.services.meta_whatsapp_service import MetaWhatsAppService
from app.services.message_service import MessageService
from app.services.twilio_whatsapp_service import TwilioWhatsAppService
from app.services.webhook_queue_service import WebhookQueueService

router = APIRouter(prefix="/webhook/whatsapp", tags=["webhook"])


@router.get("")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
):
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("", response_model=APIResponse)
async def receive_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None, alias="X-Hub-Signature-256"),
    db=Depends(get_db),
):
    raw_body = await request.body()
    if len(raw_body) > get_settings().webhook_max_body_bytes:
        raise HTTPException(status_code=413, detail="Payload do webhook excede o limite permitido")
    payload = await request.json()
    meta_service = MetaWhatsAppService()
    service = MessageService(db)
    queue_service = WebhookQueueService(db)
    settings = get_settings()

    if meta_service.is_meta_webhook(payload):
        if settings.app_env != "development" and not settings.whatsapp_app_secret:
            raise HTTPException(status_code=503, detail="Webhook Meta sem segredo configurado")
        if settings.whatsapp_app_secret and not meta_service.validate_signature(raw_body, x_hub_signature_256, settings.whatsapp_app_secret):
            raise HTTPException(status_code=403, detail="Assinatura do webhook invalida")
        if queue_service.enabled:
            stream_id = await queue_service.enqueue_meta_webhook(payload)
            return APIResponse(
                message="Evento Meta enfileirado com sucesso",
                data={"queued": True, "stream_id": stream_id},
            )
        result = await service.process_meta_webhook_event(payload)
        return APIResponse(message="Evento Meta processado com sucesso", data=result)

    parsed = WhatsAppWebhookPayload.model_validate(payload)
    if queue_service.enabled:
        stream_id = await queue_service.enqueue_incoming_message(parsed)
        return APIResponse(
            message="Mensagem enfileirada com sucesso",
            data={"queued": True, "stream_id": stream_id},
        )
    result = await service.process_incoming_message(parsed)
    return APIResponse(message="Mensagem processada com sucesso", data=result.model_dump())


@router.post("/dev/meta-sample", response_model=APIResponse)
async def simulate_meta_webhook(payload: LocalMetaWebhookSimulationRequest, db=Depends(get_db)):
    settings = get_settings()
    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Simulacao local disponivel apenas em development")

    service = MessageService(db)
    queue_service = WebhookQueueService(db)
    meta_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "local-dev-waba",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": payload.display_phone_number,
                                "phone_number_id": payload.phone_number_id,
                            },
                            "contacts": [
                                {
                                    "profile": {"name": payload.contact_name or "Contato Local"},
                                    "wa_id": payload.phone,
                                }
                            ],
                            "messages": [
                                {
                                    "from": payload.phone,
                                    "id": "wamid.local.dev.message",
                                    "timestamp": "1758254144",
                                    "text": {"body": payload.message},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }
    if queue_service.enabled:
        stream_id = await queue_service.enqueue_meta_webhook(meta_payload)
        return APIResponse(
            message="Evento Meta local enfileirado com sucesso",
            data={"queued": True, "stream_id": stream_id},
        )
    result = await service.process_meta_webhook_event(meta_payload)
    return APIResponse(message="Evento Meta local simulado com sucesso", data=result)


@router.post("/twilio", response_model=APIResponse)
async def receive_twilio_webhook(
    request: Request,
    x_twilio_signature: str | None = Header(default=None, alias="X-Twilio-Signature"),
    db=Depends(get_db),
):
    raw_body = await request.body()
    if len(raw_body) > get_settings().webhook_max_body_bytes:
        raise HTTPException(status_code=413, detail="Payload do webhook excede o limite permitido")
    form = await request.form()
    payload = {key: value for key, value in form.items()}
    settings = get_settings()
    twilio_service = TwilioWhatsAppService()
    service = MessageService(db)
    queue_service = WebhookQueueService(db)
    if settings.app_env != "development":
        if not settings.twilio_auth_token:
            raise HTTPException(status_code=503, detail="Webhook Twilio sem segredo configurado")
        if not twilio_service.validate_signature(str(request.url), payload, x_twilio_signature, settings.twilio_auth_token):
            raise HTTPException(status_code=403, detail="Assinatura do webhook Twilio invalida")
    if queue_service.enabled:
        stream_id = await queue_service.enqueue_twilio_webhook(payload)
        return APIResponse(
            message="Evento Twilio enfileirado com sucesso",
            data={"queued": True, "stream_id": stream_id},
        )
    result = await service.process_twilio_webhook_event(payload)
    return APIResponse(message="Evento Twilio processado com sucesso", data=result)
