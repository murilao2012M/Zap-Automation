from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.tenant_setup import (
    TenantBillingProfileResponse,
    TenantSenderOnboardingResponse,
)
from app.services.automation_service import AutomationService
from app.services.plan_service import PlanService
from app.utils.serialization import sanitize_mongo_document


class TenantSetupService:
    def __init__(self, db):
        self.db = db
        self.settings = get_settings()
        self.plan_service = PlanService(db)
        self.automation_service = AutomationService(db)

    async def _get_tenant(self, tenant_id: str) -> dict:
        tenant = sanitize_mongo_document(await self.db.tenants.find_one({"id": tenant_id}))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant nao encontrado")
        return tenant

    async def _get_owner(self, tenant_id: str) -> dict | None:
        owner = await self.db.users.find_one({"tenant_id": tenant_id, "role": "owner"})
        return sanitize_mongo_document(owner)

    def _resolve_checkout_url(self, plan: dict, profile: dict) -> tuple[str | None, str]:
        override = profile.get("checkout_url_override")
        if override:
            return str(override), "tenant_override"

        plan_checkout = plan.get("checkout_url")
        if plan_checkout:
            return str(plan_checkout), "plan_default"

        if profile.get("contract_mode") == "custom":
            return None, "manual_quote"
        return None, "not_configured"

    @staticmethod
    def _billing_next_action(*, billing_status: str, checkout_source: str, has_contact_email: bool) -> str:
        if not has_contact_email:
            return "Preencha um email de faturamento para isolar cobranca e notificacoes deste tenant."
        if billing_status == "active":
            return "Tenant com trilha comercial ativa. Agora acompanhe renovacao, uso e inadimplencia por esta conta."
        if billing_status == "past_due":
            return "Regularize a cobranca deste tenant antes de ampliar uso, numeros ou equipe."
        if checkout_source == "tenant_override":
            return "Checkout isolado por tenant pronto. Compartilhe este link com o responsavel financeiro da empresa."
        if checkout_source == "plan_default":
            return "O tenant ja pode usar o checkout padrao do plano sem depender do restante da base."
        if checkout_source == "manual_quote":
            return "Este tenant segue por proposta manual. Registre contrato e assinatura externa antes do go-live."
        return "Defina o fluxo comercial deste tenant para isolar cobranca, upgrade e renovacao."

    async def get_billing_profile(self, tenant_id: str) -> TenantBillingProfileResponse:
        tenant = await self._get_tenant(tenant_id)
        owner = await self._get_owner(tenant_id)
        profile = sanitize_mongo_document(await self.db.tenant_billing_profiles.find_one({"tenant_id": tenant_id})) or {}

        selected_plan = profile.get("selected_plan") or tenant.get("plan_name", "starter")
        plan = await self.plan_service.get_plan_by_name(selected_plan)
        checkout_url, checkout_source = self._resolve_checkout_url(plan, profile)
        billing_status = profile.get("billing_status") or ("active" if tenant.get("status") == "active" else "draft")

        return TenantBillingProfileResponse(
            tenant_id=tenant_id,
            billing_company_name=profile.get("billing_company_name") or tenant.get("name", ""),
            billing_contact_name=profile.get("billing_contact_name") or (owner.get("name") if owner else ""),
            billing_contact_email=profile.get("billing_contact_email") or (owner.get("email") if owner else ""),
            billing_contact_phone=profile.get("billing_contact_phone") or tenant.get("whatsapp_number") or "",
            billing_document=profile.get("billing_document") or "",
            billing_address=profile.get("billing_address") or "",
            selected_plan=selected_plan,
            contract_mode=profile.get("contract_mode") or "assisted",
            billing_status=billing_status,
            checkout_url_override=profile.get("checkout_url_override"),
            checkout_url=checkout_url,
            checkout_source=checkout_source,
            external_customer_id=profile.get("external_customer_id"),
            external_subscription_id=profile.get("external_subscription_id"),
            legal_notes=profile.get("legal_notes"),
            next_action=self._billing_next_action(
                billing_status=billing_status,
                checkout_source=checkout_source,
                has_contact_email=bool(profile.get("billing_contact_email") or (owner and owner.get("email"))),
            ),
            updated_at=profile.get("updated_at"),
            updated_by_email=profile.get("updated_by_email"),
        )

    async def update_billing_profile(self, tenant_id: str, payload: dict, *, actor_email: str | None = None) -> TenantBillingProfileResponse:
        await self._get_tenant(tenant_id)
        now = datetime.now(timezone.utc)
        update_data = {key: value for key, value in payload.items() if value is not None}
        update_data["updated_at"] = now
        if actor_email:
            update_data["updated_by_email"] = actor_email

        await self.db.tenant_billing_profiles.update_one(
            {"tenant_id": tenant_id},
            {
                "$set": update_data,
                "$setOnInsert": {"tenant_id": tenant_id, "created_at": now},
            },
            upsert=True,
        )
        return await self.get_billing_profile(tenant_id)

    @staticmethod
    def _provider_portal_label(provider: str) -> str | None:
        if provider == "twilio":
            return "Twilio Console"
        if provider == "meta":
            return "Meta Business Manager"
        return None

    def _webhook_url(self, provider: str) -> str | None:
        base_url = self.settings.public_backend_base_url.strip().rstrip("/")
        if not base_url:
            return None
        if provider == "twilio":
            return f"{base_url}{self.settings.api_prefix}/webhook/whatsapp/twilio"
        if provider == "meta":
            return f"{base_url}{self.settings.api_prefix}/webhook/whatsapp"
        return None

    @staticmethod
    def _sender_next_action(*, provider: str, status_value: str, connected: bool, sandbox_mode: bool) -> str:
        if provider == "simulation":
            return "Escolha Twilio ou Meta para iniciar um onboarding de sender de producao."
        if status_value == "connected":
            return "Sender conectado e validado. Este tenant ja pode operar com numero real."
        if sandbox_mode:
            return "O tenant ainda usa sandbox. Solicite ou conecte um sender proprio antes do lancamento."
        if status_value == "awaiting_operator":
            return "Um operador precisa concluir a implantacao assistida e salvar as credenciais finais deste tenant."
        if status_value == "awaiting_provider":
            return "Acompanhe a aprovacao do provedor e finalize a conexao assim que o sender for liberado."
        if status_value == "ready_for_validation":
            return "Envie uma mensagem real, confirme o recebimento e valide o canal no dashboard."
        if status_value == "awaiting_customer":
            return "Preencha os dados do sender e salve as credenciais do canal para este tenant."
        if connected:
            return "O canal esta conectado. Falta validar operacao real e marcar este tenant como pronto."
        return "Preencha o briefing do sender e escolha se esta conta sera self-service ou assistida."

    async def get_sender_onboarding(self, tenant_id: str) -> TenantSenderOnboardingResponse:
        tenant = await self._get_tenant(tenant_id)
        owner = await self._get_owner(tenant_id)
        request_doc = sanitize_mongo_document(await self.db.tenant_sender_onboarding.find_one({"tenant_id": tenant_id})) or {}
        channel = await self.automation_service.get_channel_config(tenant_id)

        provider = request_doc.get("provider") or tenant.get("channel_provider", "simulation")
        setup_mode = request_doc.get("setup_mode") or tenant.get("channel_setup_mode", "self_service")
        status_value = request_doc.get("status") or "draft"
        has_validation_stamp = bool(request_doc.get("validated_at") or tenant.get("channel_last_validated_at"))

        if provider == "simulation":
            status_value = "draft"
        elif channel.connected and not channel.sandbox_mode and has_validation_stamp:
            status_value = "connected"
        elif channel.connected and not channel.sandbox_mode:
            status_value = "ready_for_validation"
        elif channel.sandbox_mode:
            status_value = "awaiting_provider"
        elif request_doc.get("last_submitted_at"):
            status_value = "awaiting_customer"

        return TenantSenderOnboardingResponse(
            tenant_id=tenant_id,
            provider=provider,
            setup_mode=setup_mode,
            status=status_value,
            business_display_name=request_doc.get("business_display_name") or tenant.get("name", ""),
            sender_phone_number=request_doc.get("sender_phone_number") or tenant.get("whatsapp_number") or tenant.get("twilio_whatsapp_number") or "",
            sender_country=request_doc.get("sender_country") or "BR",
            website_url=request_doc.get("website_url") or "",
            use_existing_number=bool(request_doc.get("use_existing_number", True)),
            contact_name=request_doc.get("contact_name") or (owner.get("name") if owner else ""),
            contact_email=request_doc.get("contact_email") or (owner.get("email") if owner else ""),
            contact_phone=request_doc.get("contact_phone") or tenant.get("whatsapp_number") or "",
            notes=request_doc.get("notes"),
            provider_portal_label=self._provider_portal_label(provider),
            webhook_url=self._webhook_url(provider),
            requires_operator_action=setup_mode == "assisted" or channel.requires_assisted_setup,
            next_action=self._sender_next_action(
                provider=provider,
                status_value=status_value,
                connected=channel.connected,
                sandbox_mode=channel.sandbox_mode,
            ),
            last_submitted_at=request_doc.get("last_submitted_at"),
            validated_at=request_doc.get("validated_at") or tenant.get("channel_last_validated_at"),
            updated_at=request_doc.get("updated_at"),
            updated_by_email=request_doc.get("updated_by_email"),
        )

    async def update_sender_onboarding(self, tenant_id: str, payload: dict, *, actor_email: str | None = None) -> TenantSenderOnboardingResponse:
        tenant = await self._get_tenant(tenant_id)
        now = datetime.now(timezone.utc)
        update_data = {key: value for key, value in payload.items() if value is not None}
        update_data["updated_at"] = now
        update_data.setdefault("status", "draft")
        if actor_email:
            update_data["updated_by_email"] = actor_email

        await self.db.tenant_sender_onboarding.update_one(
            {"tenant_id": tenant_id},
            {
                "$set": update_data,
                "$setOnInsert": {"tenant_id": tenant_id, "created_at": now},
            },
            upsert=True,
        )

        if update_data.get("provider") or update_data.get("setup_mode"):
            await self.db.tenants.update_one(
                {"id": tenant_id},
                {
                    "$set": {
                        **({"channel_provider": update_data["provider"]} if update_data.get("provider") else {}),
                        "channel_setup_mode": update_data.get("setup_mode") or tenant.get("channel_setup_mode") or "self_service",
                        "updated_at": now,
                    }
                },
            )

        return await self.get_sender_onboarding(tenant_id)

    async def submit_sender_onboarding(self, tenant_id: str, *, actor_email: str | None = None) -> TenantSenderOnboardingResponse:
        current = await self.get_sender_onboarding(tenant_id)
        now = datetime.now(timezone.utc)

        if current.provider == "simulation":
            status_value = "draft"
        elif current.setup_mode == "assisted":
            status_value = "awaiting_operator"
        elif current.provider == "twilio" and current.sender_phone_number and current.contact_email:
            status_value = "awaiting_customer"
        elif current.provider == "meta" and current.business_display_name and current.contact_email:
            status_value = "awaiting_customer"
        else:
            status_value = "submitted"

        update_data: dict[str, object] = {
            "status": status_value,
            "last_submitted_at": now,
            "updated_at": now,
        }
        if actor_email:
            update_data["updated_by_email"] = actor_email

        await self.db.tenant_sender_onboarding.update_one(
            {"tenant_id": tenant_id},
            {
                "$set": update_data,
                "$setOnInsert": {"tenant_id": tenant_id, "created_at": now},
            },
            upsert=True,
        )
        return await self.get_sender_onboarding(tenant_id)

    async def validate_sender_onboarding(self, tenant_id: str, *, actor_email: str | None = None) -> TenantSenderOnboardingResponse:
        current = await self.get_sender_onboarding(tenant_id)
        channel = await self.automation_service.get_channel_config(tenant_id)
        if current.provider == "simulation":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Escolha Twilio ou Meta antes de validar o sender.")
        if not channel.connected:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conecte o canal e salve as credenciais antes de validar.")
        if channel.sandbox_mode:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O canal ainda esta em sandbox. Troque para um sender proprio antes de validar.")

        now = datetime.now(timezone.utc)
        onboarding_update: dict[str, object] = {
            "status": "connected",
            "validated_at": now,
            "updated_at": now,
        }
        tenant_update: dict[str, object] = {
            "channel_last_validated_at": now,
            "channel_credentials_status": "validated",
            "updated_at": now,
        }
        if actor_email:
            onboarding_update["updated_by_email"] = actor_email
            tenant_update["channel_credentials_updated_by_email"] = actor_email

        await self.db.tenant_sender_onboarding.update_one(
            {"tenant_id": tenant_id},
            {
                "$set": onboarding_update,
                "$setOnInsert": {"tenant_id": tenant_id, "created_at": now},
            },
            upsert=True,
        )
        await self.db.tenants.update_one({"id": tenant_id}, {"$set": tenant_update})
        return await self.get_sender_onboarding(tenant_id)
