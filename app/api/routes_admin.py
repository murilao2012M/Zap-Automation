from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.api.deps import assert_tenant_access, get_current_user, get_db
from app.schemas.tenant_setup import (
    TenantBillingProfileUpdateRequest,
    TenantSenderOnboardingUpdateRequest,
)
from app.schemas.common import APIResponse
from app.schemas.messaging import ManualConversationReplyRequest
from app.services.audit_service import AuditService
from app.services.message_service import MessageService
from app.services.metrics_service import MetricsService
from app.services.plan_service import PlanService
from app.services.tenant_setup_service import TenantSetupService
from app.utils.serialization import sanitize_mongo_document

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/me", response_model=APIResponse)
async def me(current_user=Depends(get_current_user)):
    safe_user = {key: value for key, value in current_user.items() if key != "password_hash"}
    return APIResponse(message="Usuario autenticado", data=safe_user)


@router.get("/tenants/{tenant_id}/health", response_model=APIResponse)
async def tenant_health(tenant_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, tenant_id)
    service = MetricsService(db)
    health = await service.build_health_score(tenant_id)
    return APIResponse(message="Termometro gerado com sucesso", data=health.model_dump())


@router.get("/tenants/{tenant_id}/dashboard", response_model=APIResponse)
async def tenant_dashboard(tenant_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, tenant_id)
    total_contacts = await db.contacts.count_documents({"tenant_id": tenant_id})
    total_conversations = await db.conversations.count_documents({"tenant_id": tenant_id})
    total_messages = await db.messages.count_documents({"tenant_id": tenant_id})
    open_handoffs = await db.conversations.count_documents({"tenant_id": tenant_id, "status": "human"})
    commercial = await PlanService(db).build_usage_snapshot(tenant_id)
    return APIResponse(
        message="Dashboard carregado com sucesso",
        data={
            "tenant_id": tenant_id,
            "totals": {
                "contacts": total_contacts,
                "conversations": total_conversations,
                "messages": total_messages,
                "human_handoffs_open": open_handoffs,
            },
            "plan": commercial["plan"],
            "usage": commercial["usage"],
            "commercial_alerts": commercial["alerts"],
            "onboarding": commercial["onboarding"],
        },
    )


@router.get("/tenants/{tenant_id}/billing", response_model=APIResponse)
async def tenant_billing_profile(
    tenant_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id)
    profile = await TenantSetupService(db).get_billing_profile(tenant_id)
    return APIResponse(message="Faturamento carregado com sucesso", data=profile.model_dump())


@router.put("/tenants/{tenant_id}/billing", response_model=APIResponse)
async def update_tenant_billing_profile(
    tenant_id: str,
    payload: TenantBillingProfileUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    profile = await TenantSetupService(db).update_billing_profile(
        tenant_id,
        payload.model_dump(exclude_none=True),
        actor_email=current_user.get("email"),
    )
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="tenant.billing_updated",
        resource_type="tenant_billing_profile",
        resource_id=tenant_id,
        detail="Perfil comercial e de faturamento atualizado",
        metadata={"fields": sorted(payload.model_dump(exclude_none=True).keys())},
    )
    return APIResponse(message="Faturamento atualizado com sucesso", data=profile.model_dump())


@router.get("/tenants/{tenant_id}/sender-onboarding", response_model=APIResponse)
async def tenant_sender_onboarding(
    tenant_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id)
    onboarding = await TenantSetupService(db).get_sender_onboarding(tenant_id)
    return APIResponse(message="Onboarding do sender carregado com sucesso", data=onboarding.model_dump())


@router.put("/tenants/{tenant_id}/sender-onboarding", response_model=APIResponse)
async def update_tenant_sender_onboarding(
    tenant_id: str,
    payload: TenantSenderOnboardingUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    onboarding = await TenantSetupService(db).update_sender_onboarding(
        tenant_id,
        payload.model_dump(exclude_none=True),
        actor_email=current_user.get("email"),
    )
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="tenant.sender_onboarding_updated",
        resource_type="tenant_sender_onboarding",
        resource_id=tenant_id,
        detail="Briefing do sender atualizado",
        metadata={"fields": sorted(payload.model_dump(exclude_none=True).keys())},
    )
    return APIResponse(message="Onboarding do sender atualizado com sucesso", data=onboarding.model_dump())


@router.post("/tenants/{tenant_id}/sender-onboarding/submit", response_model=APIResponse)
async def submit_tenant_sender_onboarding(
    tenant_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    onboarding = await TenantSetupService(db).submit_sender_onboarding(
        tenant_id,
        actor_email=current_user.get("email"),
    )
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="tenant.sender_onboarding_submitted",
        resource_type="tenant_sender_onboarding",
        resource_id=tenant_id,
        detail="Onboarding do sender enviado para acompanhamento",
    )
    return APIResponse(message="Onboarding do sender enviado com sucesso", data=onboarding.model_dump())


@router.post("/tenants/{tenant_id}/sender-onboarding/validate", response_model=APIResponse)
async def validate_tenant_sender_onboarding(
    tenant_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    onboarding = await TenantSetupService(db).validate_sender_onboarding(
        tenant_id,
        actor_email=current_user.get("email"),
    )
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="tenant.sender_onboarding_validated",
        resource_type="tenant_sender_onboarding",
        resource_id=tenant_id,
        detail="Sender validado e marcado como pronto para operacao",
    )
    return APIResponse(message="Sender validado com sucesso", data=onboarding.model_dump())


@router.get("/tenants/{tenant_id}/conversations", response_model=APIResponse)
async def list_conversations(
    tenant_id: str,
    status: str | None = Query(default=None),
    intent: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id)
    query: dict = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if intent:
        query["current_intent"] = intent

    conversations = await db.conversations.find(query).sort("updated_at", -1).to_list(length=200)
    results = []
    for conversation in conversations:
        sanitized_conversation = sanitize_mongo_document(conversation) or {}
        contact = sanitize_mongo_document(await db.contacts.find_one({"id": sanitized_conversation.get("contact_id")}))
        last_message = sanitize_mongo_document(
            await db.messages.find_one({"conversation_id": sanitized_conversation["id"]}, sort=[("created_at", -1)])
        )
        if search:
            haystack = " ".join(
                [
                    str(contact.get("name", "")) if contact else "",
                    str(contact.get("phone", "")) if contact else "",
                    str(last_message.get("content", "")) if last_message else "",
                ]
            ).lower()
            if search.lower() not in haystack:
                continue
        results.append(
            {
                **sanitized_conversation,
                "contact_name": contact.get("name") if contact else None,
                "contact_phone": contact.get("phone") if contact else None,
                "last_message_preview": last_message.get("content") if last_message else None,
            }
        )

    return APIResponse(message="Conversas carregadas com sucesso", data=results)


@router.get("/tenants/{tenant_id}/conversations/{conversation_id}/messages", response_model=APIResponse)
async def conversation_messages(
    tenant_id: str,
    conversation_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id)
    messages = await db.messages.find({"tenant_id": tenant_id, "conversation_id": conversation_id}).sort("created_at", 1).to_list(length=200)
    return APIResponse(
        message="Mensagens carregadas com sucesso",
        data=[sanitize_mongo_document(message) for message in messages],
    )


@router.post("/tenants/{tenant_id}/conversations/{conversation_id}/handoff", response_model=APIResponse)
async def handoff_conversation(
    tenant_id: str,
    conversation_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin", "agent"})
    await db.conversations.update_one(
        {"tenant_id": tenant_id, "id": conversation_id},
        {
            "$set": {
                "status": "human",
                "handoff_reason": "manual_handoff_from_dashboard",
            }
        },
    )
    conversation = sanitize_mongo_document(await db.conversations.find_one({"tenant_id": tenant_id, "id": conversation_id}))
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="conversation.handoff",
        resource_type="conversation",
        resource_id=conversation_id,
        detail="Conversa encaminhada para atendimento humano",
    )
    return APIResponse(message="Conversa encaminhada para humano", data=conversation)


@router.post("/tenants/{tenant_id}/conversations/{conversation_id}/resume", response_model=APIResponse)
async def resume_conversation(
    tenant_id: str,
    conversation_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin", "agent"})
    await db.conversations.update_one(
        {"tenant_id": tenant_id, "id": conversation_id},
        {
            "$set": {
                "status": "bot",
                "handoff_reason": None,
            }
        },
    )
    conversation = sanitize_mongo_document(await db.conversations.find_one({"tenant_id": tenant_id, "id": conversation_id}))
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="conversation.resume_bot",
        resource_type="conversation",
        resource_id=conversation_id,
        detail="Conversa devolvida para automacao",
    )
    return APIResponse(message="Conversa devolvida ao bot", data=conversation)


@router.post("/tenants/{tenant_id}/conversations/{conversation_id}/reply", response_model=APIResponse)
async def reply_to_conversation(
    tenant_id: str,
    conversation_id: str,
    payload: ManualConversationReplyRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin", "agent"})
    updated_conversation = await MessageService(db).send_manual_reply(
        tenant_id=tenant_id,
        conversation_id=conversation_id,
        content=payload.content,
        message_type=payload.message_type,
        current_user=current_user,
    )
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="conversation.manual_reply",
        resource_type="conversation",
        resource_id=conversation_id,
        detail="Resposta manual enviada pela operacao",
        metadata={"message_type": payload.message_type},
    )
    return APIResponse(message="Mensagem humana enviada com sucesso", data=updated_conversation)


@router.get("/tenants/{tenant_id}/operations/events", response_model=APIResponse)
async def tenant_operation_events(
    tenant_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id)
    events = await db.operation_events.find({"tenant_id": tenant_id}).sort("created_at", -1).to_list(length=20)
    return APIResponse(
        message="Eventos operacionais carregados com sucesso",
        data=[sanitize_mongo_document(event) for event in events],
    )


@router.get("/tenants/{tenant_id}/audit/events", response_model=APIResponse)
async def tenant_audit_events(
    tenant_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    events = await db.audit_events.find({"tenant_id": tenant_id}).sort("created_at", -1).to_list(length=50)
    return APIResponse(
        message="Auditoria carregada com sucesso",
        data=[sanitize_mongo_document(event) for event in events],
    )
