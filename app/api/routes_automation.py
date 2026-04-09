from fastapi import APIRouter, Depends, status

from app.api.deps import assert_tenant_access, get_current_user, get_db
from app.schemas.automation import (
    AutomationFlowRequest,
    AutomationFlowUpdateRequest,
    AutomationRuleRequest,
    AutomationRuleUpdateRequest,
    BotSettingsUpdateRequest,
    MessageTemplateRequest,
    MessageTemplateUpdateRequest,
    WhatsAppChannelConfigUpdateRequest,
)
from app.schemas.common import APIResponse
from app.services.audit_service import AuditService
from app.services.automation_service import AutomationService

router = APIRouter(prefix="/automation", tags=["automation"])


@router.get("/tenants/{tenant_id}/rules", response_model=APIResponse)
async def list_rules(tenant_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, tenant_id)
    service = AutomationService(db)
    rules = await service.get_rules(tenant_id)
    return APIResponse(message="Regras carregadas com sucesso", data=rules)


@router.post("/tenants/{tenant_id}/rules", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    tenant_id: str,
    payload: AutomationRuleRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    rule = await service.create_rule(tenant_id, payload.model_dump())
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.rule_created",
        resource_type="automation_rule",
        resource_id=rule.get("id"),
        detail="Nova regra criada",
        metadata={"name": rule.get("name")},
    )
    return APIResponse(message="Regra criada com sucesso", data=rule)


@router.patch("/tenants/{tenant_id}/rules/{rule_id}", response_model=APIResponse)
async def update_rule(
    tenant_id: str,
    rule_id: str,
    payload: AutomationRuleUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    rule = await service.update_rule(tenant_id, rule_id, payload.model_dump(exclude_unset=True))
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.rule_updated",
        resource_type="automation_rule",
        resource_id=rule_id,
        detail="Regra atualizada",
        metadata={"fields": sorted(payload.model_dump(exclude_unset=True).keys())},
    )
    return APIResponse(message="Regra atualizada com sucesso", data=rule)


@router.get("/tenants/{tenant_id}/settings", response_model=APIResponse)
async def get_settings(tenant_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, tenant_id)
    service = AutomationService(db)
    settings = await service.get_bot_settings(tenant_id)
    return APIResponse(message="Configuracao do bot carregada com sucesso", data=settings.model_dump())


@router.put("/tenants/{tenant_id}/settings", response_model=APIResponse)
async def update_settings(
    tenant_id: str,
    payload: BotSettingsUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    settings = await service.update_bot_settings(tenant_id, payload)
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.settings_updated",
        resource_type="bot_settings",
        resource_id=tenant_id,
        detail="Configuracoes do bot atualizadas",
        metadata={"fields": sorted(payload.model_dump(exclude_unset=True).keys())},
    )
    return APIResponse(message="Configuracao do bot atualizada com sucesso", data=settings.model_dump())


@router.get("/tenants/{tenant_id}/channel", response_model=APIResponse)
async def get_channel(tenant_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, tenant_id)
    service = AutomationService(db)
    channel = await service.get_channel_config(tenant_id)
    return APIResponse(message="Canal carregado com sucesso", data=channel.model_dump())


@router.put("/tenants/{tenant_id}/channel", response_model=APIResponse)
async def update_channel(
    tenant_id: str,
    payload: WhatsAppChannelConfigUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    channel = await service.update_channel_config(
        tenant_id,
        payload.model_dump(exclude_none=True),
        actor_email=current_user.get("email"),
    )
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.channel_updated",
        resource_type="whatsapp_channel",
        resource_id=tenant_id,
        detail="Canal do WhatsApp atualizado",
        metadata={"provider": channel.provider},
    )
    return APIResponse(message="Canal atualizado com sucesso", data=channel.model_dump())


@router.get("/tenants/{tenant_id}/flows", response_model=APIResponse)
async def list_flows(tenant_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, tenant_id)
    service = AutomationService(db)
    flows = await service.get_flows(tenant_id)
    return APIResponse(message="Fluxos carregados com sucesso", data=flows)


@router.post("/tenants/{tenant_id}/flows", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_flow(
    tenant_id: str,
    payload: AutomationFlowRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    flow = await service.create_flow(tenant_id, payload.model_dump())
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.flow_created",
        resource_type="automation_flow",
        resource_id=flow.get("id"),
        detail="Novo fluxo criado",
        metadata={"name": flow.get("name"), "intent": flow.get("intent")},
    )
    return APIResponse(message="Fluxo criado com sucesso", data=flow)


@router.patch("/tenants/{tenant_id}/flows/{flow_id}", response_model=APIResponse)
async def update_flow(
    tenant_id: str,
    flow_id: str,
    payload: AutomationFlowUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    flow = await service.update_flow(tenant_id, flow_id, payload.model_dump(exclude_unset=True))
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.flow_updated",
        resource_type="automation_flow",
        resource_id=flow_id,
        detail="Fluxo atualizado",
        metadata={"fields": sorted(payload.model_dump(exclude_unset=True).keys())},
    )
    return APIResponse(message="Fluxo atualizado com sucesso", data=flow)


@router.get("/tenants/{tenant_id}/templates", response_model=APIResponse)
async def list_templates(tenant_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, tenant_id)
    service = AutomationService(db)
    templates = await service.get_templates(tenant_id)
    return APIResponse(message="Templates carregados com sucesso", data=templates)


@router.post("/tenants/{tenant_id}/templates", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    tenant_id: str,
    payload: MessageTemplateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    template = await service.create_template(tenant_id, payload.model_dump())
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.template_created",
        resource_type="message_template",
        resource_id=template.get("id"),
        detail="Novo template criado",
        metadata={"name": template.get("name"), "category": template.get("category")},
    )
    return APIResponse(message="Template criado com sucesso", data=template)


@router.patch("/tenants/{tenant_id}/templates/{template_id}", response_model=APIResponse)
async def update_template(
    tenant_id: str,
    template_id: str,
    payload: MessageTemplateUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_tenant_access(current_user, tenant_id, allowed_roles={"owner", "admin"})
    service = AutomationService(db)
    template = await service.update_template(tenant_id, template_id, payload.model_dump(exclude_unset=True))
    await AuditService(db).record(
        tenant_id=tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="automation.template_updated",
        resource_type="message_template",
        resource_id=template_id,
        detail="Template atualizado",
        metadata={"fields": sorted(payload.model_dump(exclude_unset=True).keys())},
    )
    return APIResponse(message="Template atualizado com sucesso", data=template)
