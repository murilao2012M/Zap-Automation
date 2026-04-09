from __future__ import annotations

from datetime import datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status

from app.schemas.automation import BotSettingsResponse, BotSettingsUpdateRequest, WhatsAppChannelConfigResponse
from app.schemas.domain import AutomationFlow, AutomationRule, MessageTemplate
from app.services.plan_service import PlanService
from app.utils.serialization import sanitize_mongo_document

INTENT_MENU_MAP = {
    "1": "compra",
    "2": "suporte",
    "3": "financeiro",
    "4": "agendamento",
}

DEFAULT_WELCOME_MESSAGE = "Olá! Sou o assistente virtual da empresa. Como posso ajudar você hoje?"
DEFAULT_FALLBACK_MESSAGE = (
    "Recebi sua mensagem. Posso ajudar com compras, suporte, financeiro ou agendamento. "
    "Se preferir, responda com o assunto que deseja tratar."
)
DEFAULT_HANDOFF_MESSAGE = (
    "Perfeito. Vou encaminhar sua conversa para um atendente humano e seguiremos por aqui."
)
DEFAULT_AFTER_HOURS_MESSAGE = (
    "Nosso atendimento está fora do horário no momento. Deixe sua mensagem com o máximo de detalhes "
    "e retornaremos no próximo período útil."
)


class AutomationService:
    def __init__(self, db):
        self.db = db
        self.plan_service = PlanService(db)

    @staticmethod
    def _is_twilio_sandbox_number(value: str | None) -> bool:
        if not value:
            return False
        normalized = "".join(char for char in value if char.isdigit() or char == "+")
        return normalized in {"+14155238886", "14155238886"}

    @staticmethod
    def default_rule_templates() -> list[dict]:
        return [
            {
                "name": "menu_inicial",
                "keywords": ["menu", "opções", "opcoes", "ajuda", "oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "início", "inicio"],
                "response_template": (
                    "Olá! Escolha uma opção para continuar:\n"
                    "1 - Compras\n"
                    "2 - Suporte\n"
                    "3 - Financeiro\n"
                    "4 - Agendamento"
                ),
                "requires_human": False,
                "active": True,
                "priority": 10,
                "trigger_type": "keyword",
                "trigger_value": "menu",
            },
            {
                "name": "falar_humano",
                "keywords": ["humano", "atendente", "pessoa", "vendedor", "gerente", "especialista", "consultor"],
                "response_template": "Perfeito. Vou encaminhar sua conversa para um atendente humano para seguir com você.",
                "requires_human": True,
                "active": True,
                "priority": 5,
                "trigger_type": "keyword",
                "trigger_value": "human",
            },
            {
                "name": "menu_compras",
                "keywords": [],
                "intent": "compra",
                "response_template": (
                    "Ótimo. Posso ajudar com produtos, preços, orçamento e próximos passos da compra. "
                    "Se quiser, me diga o que você procura e eu sigo com o atendimento."
                ),
                "requires_human": False,
                "active": True,
                "priority": 20,
                "trigger_type": "intent",
                "trigger_value": "compra",
            },
            {
                "name": "menu_suporte",
                "keywords": [],
                "intent": "suporte",
                "response_template": (
                    "Vamos resolver isso. Descreva o problema com mais detalhes para que eu direcione seu suporte com mais rapidez."
                ),
                "requires_human": False,
                "active": True,
                "priority": 20,
                "trigger_type": "intent",
                "trigger_value": "suporte",
            },
            {
                "name": "menu_financeiro",
                "keywords": [],
                "intent": "financeiro",
                "response_template": (
                    "Posso ajudar com boleto, cobrança, pagamento e segunda via. "
                    "Me diga qual é a sua necessidade para eu orientar você."
                ),
                "requires_human": False,
                "active": True,
                "priority": 20,
                "trigger_type": "intent",
                "trigger_value": "financeiro",
            },
            {
                "name": "menu_agendamento",
                "keywords": [],
                "intent": "agendamento",
                "response_template": (
                    "Certo. Vamos cuidar do seu agendamento. Informe o melhor dia e horário para seguirmos."
                ),
                "requires_human": False,
                "active": True,
                "priority": 20,
                "trigger_type": "intent",
                "trigger_value": "agendamento",
            },
        ]

    @staticmethod
    def default_flow_templates() -> list[dict]:
        return [
            {
                "name": "Fluxo Compras",
                "intent": "compra",
                "description": "Fluxo para qualificar oportunidades comerciais e acelerar vendas.",
                "entry_message": (
                    "Perfeito. A {{company_name}} pode ajudar com produtos, preços, orçamento e próximos passos da compra. "
                    "Me conte o que você procura."
                ),
                "fallback_message": (
                    "Se preferir, envie o nome do produto ou serviço para eu agilizar o seu atendimento."
                ),
                "requires_human": False,
                "active": True,
                "priority": 10,
            },
            {
                "name": "Fluxo Suporte",
                "intent": "suporte",
                "description": "Fluxo para suporte técnico, dúvidas operacionais e triagem inicial.",
                "entry_message": (
                    "Vamos resolver isso juntos. Descreva o problema com o máximo de detalhes para eu direcionar seu suporte."
                ),
                "fallback_message": (
                    "Se preferir, envie o número do pedido, equipamento ou contexto do erro para agilizar a análise."
                ),
                "requires_human": False,
                "active": True,
                "priority": 10,
            },
            {
                "name": "Fluxo Financeiro",
                "intent": "financeiro",
                "description": "Fluxo para cobrança, pagamento, boleto e segunda via.",
                "entry_message": (
                    "Posso ajudar com boleto, cobrança, pagamento e segunda via da {{company_name}}. "
                    "Qual é a sua necessidade?"
                ),
                "fallback_message": (
                    "Se desejar, envie CPF, número do pedido ou número da fatura para agilizar o atendimento."
                ),
                "requires_human": False,
                "active": True,
                "priority": 10,
            },
            {
                "name": "Fluxo Agendamento",
                "intent": "agendamento",
                "description": "Fluxo para agendamentos, disponibilidade e confirmação inicial.",
                "entry_message": (
                    "Vamos cuidar do seu agendamento. Informe o melhor dia e horário para seguirmos."
                ),
                "fallback_message": (
                    "Se quiser, informe também o serviço desejado para agilizar a disponibilidade."
                ),
                "requires_human": False,
                "active": True,
                "priority": 10,
            },
        ]

    @staticmethod
    def render_text(template: str, tenant: dict, extras: dict | None = None) -> str:
        values = {
            "company_name": tenant.get("name", "empresa"),
            "company_slug": tenant.get("slug", "empresa"),
        }
        if extras:
            values.update(extras)
        rendered = template
        for key, value in values.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
        return rendered

    async def ensure_default_rules(self, tenant_id: str) -> None:
        count = await self.db.automation_rules.count_documents({"tenant_id": tenant_id})
        if count == 0:
            for template in self.default_rule_templates():
                rule = AutomationRule(tenant_id=tenant_id, **template)
                await self.db.automation_rules.insert_one(rule.model_dump())

        flow_count = await self.db.automation_flows.count_documents({"tenant_id": tenant_id})
        if flow_count == 0:
            for template in self.default_flow_templates():
                flow = AutomationFlow(tenant_id=tenant_id, **template)
                await self.db.automation_flows.insert_one(flow.model_dump())

    async def get_rules(self, tenant_id: str) -> list[dict]:
        await self.ensure_default_rules(tenant_id)
        rules = await self.db.automation_rules.find({"tenant_id": tenant_id}).sort("priority", 1).to_list(length=500)
        return [sanitize_mongo_document(rule) for rule in rules]

    async def create_rule(self, tenant_id: str, payload: dict) -> dict:
        await self.plan_service.enforce_limit(tenant_id, "rules")
        rule = AutomationRule(tenant_id=tenant_id, **payload)
        await self.db.automation_rules.insert_one(rule.model_dump())
        return rule.model_dump()

    async def update_rule(self, tenant_id: str, rule_id: str, payload: dict) -> dict:
        existing = sanitize_mongo_document(await self.db.automation_rules.find_one({"tenant_id": tenant_id, "id": rule_id}))
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regra não encontrada")

        update_data = payload.copy()
        if not update_data:
            return existing

        update_data["updated_at"] = datetime.utcnow()
        await self.db.automation_rules.update_one({"id": rule_id, "tenant_id": tenant_id}, {"$set": update_data})
        updated = sanitize_mongo_document(await self.db.automation_rules.find_one({"tenant_id": tenant_id, "id": rule_id}))
        return updated or existing

    async def get_flows(self, tenant_id: str) -> list[dict]:
        await self.ensure_default_rules(tenant_id)
        flows = await self.db.automation_flows.find({"tenant_id": tenant_id}).sort("priority", 1).to_list(length=200)
        return [sanitize_mongo_document(flow) for flow in flows]

    async def create_flow(self, tenant_id: str, payload: dict) -> dict:
        await self.plan_service.enforce_limit(tenant_id, "flows")
        flow = AutomationFlow(tenant_id=tenant_id, **payload)
        await self.db.automation_flows.insert_one(flow.model_dump())
        return flow.model_dump()

    async def update_flow(self, tenant_id: str, flow_id: str, payload: dict) -> dict:
        existing = sanitize_mongo_document(await self.db.automation_flows.find_one({"tenant_id": tenant_id, "id": flow_id}))
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fluxo não encontrado")

        update_data = payload.copy()
        if not update_data:
            return existing

        update_data["updated_at"] = datetime.utcnow()
        await self.db.automation_flows.update_one({"id": flow_id, "tenant_id": tenant_id}, {"$set": update_data})
        updated = sanitize_mongo_document(await self.db.automation_flows.find_one({"tenant_id": tenant_id, "id": flow_id}))
        return updated or existing

    async def get_templates(self, tenant_id: str) -> list[dict]:
        templates = await self.db.message_templates.find({"tenant_id": tenant_id}).sort("created_at", -1).to_list(length=200)
        return [sanitize_mongo_document(template) for template in templates]

    async def create_template(self, tenant_id: str, payload: dict) -> dict:
        await self.plan_service.enforce_limit(tenant_id, "templates")
        template = MessageTemplate(tenant_id=tenant_id, **payload)
        await self.db.message_templates.insert_one(template.model_dump())
        return template.model_dump()

    async def update_template(self, tenant_id: str, template_id: str, payload: dict) -> dict:
        existing = sanitize_mongo_document(await self.db.message_templates.find_one({"tenant_id": tenant_id, "id": template_id}))
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template não encontrado")

        update_data = payload.copy()
        if not update_data:
            return existing

        update_data["updated_at"] = datetime.utcnow()
        await self.db.message_templates.update_one({"id": template_id, "tenant_id": tenant_id}, {"$set": update_data})
        updated = sanitize_mongo_document(await self.db.message_templates.find_one({"tenant_id": tenant_id, "id": template_id}))
        return updated or existing

    async def get_bot_settings(self, tenant_id: str) -> BotSettingsResponse:
        tenant = sanitize_mongo_document(await self.db.tenants.find_one({"id": tenant_id}))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado")

        return BotSettingsResponse(
            tenant_id=tenant_id,
            bot_enabled=tenant.get("bot_enabled", True),
            business_hours=tenant.get("business_hours", {}),
            welcome_message=tenant.get("welcome_message", DEFAULT_WELCOME_MESSAGE),
            fallback_message=tenant.get("fallback_message", DEFAULT_FALLBACK_MESSAGE),
            handoff_message=tenant.get("handoff_message", DEFAULT_HANDOFF_MESSAGE),
            after_hours_message=tenant.get("after_hours_message", DEFAULT_AFTER_HOURS_MESSAGE),
        )

    async def update_bot_settings(self, tenant_id: str, payload: BotSettingsUpdateRequest) -> BotSettingsResponse:
        update_data = payload.model_dump(exclude_none=True)
        if not update_data:
            return await self.get_bot_settings(tenant_id)

        update_data["updated_at"] = datetime.utcnow()
        await self.db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
        return await self.get_bot_settings(tenant_id)

    async def get_channel_config(self, tenant_id: str) -> WhatsAppChannelConfigResponse:
        tenant = sanitize_mongo_document(await self.db.tenants.find_one({"id": tenant_id}))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado")

        access_token = tenant.get("meta_access_token")
        provider = tenant.get("channel_provider", "simulation")
        twilio_number = tenant.get("twilio_whatsapp_number")
        connected = bool(
            (provider == "meta" and access_token and tenant.get("meta_phone_number_id"))
            or (
                provider == "twilio"
                and tenant.get("twilio_account_sid")
                and tenant.get("twilio_auth_token")
                and twilio_number
            )
        )
        sandbox_mode = provider == "twilio" and self._is_twilio_sandbox_number(twilio_number)
        provider_label = {
            "simulation": "Simulacao local",
            "meta": "Meta Cloud API",
            "twilio": "Twilio WhatsApp",
        }.get(provider, "Canal WhatsApp")

        if provider == "simulation":
            setup_stage = "simulation"
            setup_title = "Escolha um canal para operar"
            setup_detail = "A simulacao ajuda a validar o produto, mas ainda nao conecta um numero real de WhatsApp."
            requires_assisted_setup = False
        elif provider == "twilio" and not connected:
            setup_stage = "connect_channel"
            setup_title = "Conecte o numero da Twilio"
            setup_detail = "Preencha SID, Auth Token e numero WhatsApp para liberar o envio real pelo dashboard."
            requires_assisted_setup = True
        elif provider == "twilio" and sandbox_mode:
            setup_stage = "validate_channel"
            setup_title = "Sandbox ativo, pronto apenas para testes"
            setup_detail = "O sandbox da Twilio exige join por participante. Para lancamento, troque para um sender proprio."
            requires_assisted_setup = True
        elif provider == "meta" and not connected:
            setup_stage = "connect_channel"
            setup_title = "Conecte o numero da Meta"
            setup_detail = "Preencha token e Phone Number ID para liberar o envio real pelo dashboard."
            requires_assisted_setup = True
        else:
            setup_stage = "ready"
            setup_title = "Canal pronto para operar"
            setup_detail = "O numero esta conectado e o dashboard pode operar conversas reais."
            requires_assisted_setup = False

        return WhatsAppChannelConfigResponse(
            tenant_id=tenant_id,
            connected=connected,
            provider=provider,
            provider_label=provider_label,
            sandbox_mode=sandbox_mode,
            requires_assisted_setup=requires_assisted_setup,
            setup_stage=setup_stage,
            setup_title=setup_title,
            setup_detail=setup_detail,
            phone_number_id=tenant.get("meta_phone_number_id"),
            business_account_id=tenant.get("meta_business_account_id"),
            api_version=tenant.get("meta_api_version", "v21.0"),
            access_token_hint=f"{access_token[:6]}...{access_token[-4:]}" if access_token else None,
            twilio_account_sid_hint=(
                f"{tenant['twilio_account_sid'][:6]}...{tenant['twilio_account_sid'][-4:]}"
                if tenant.get("twilio_account_sid")
                else None
            ),
            twilio_whatsapp_number=twilio_number,
        )

    async def update_channel_config(self, tenant_id: str, payload: dict) -> WhatsAppChannelConfigResponse:
        tenant = sanitize_mongo_document(await self.db.tenants.find_one({"id": tenant_id}))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant nao encontrado")

        current_phone_id = tenant.get("meta_phone_number_id")
        requested_phone_id = payload.get("phone_number_id")
        if requested_phone_id and requested_phone_id != current_phone_id and current_phone_id:
            await self.plan_service.enforce_limit(tenant_id, "numbers", attempted_total=2)

        update_map = {
            "channel_provider": payload.get("provider"),
            "meta_phone_number_id": payload.get("phone_number_id"),
            "meta_business_account_id": payload.get("business_account_id"),
            "meta_api_version": payload.get("api_version"),
            "meta_access_token": payload.get("access_token"),
            "twilio_account_sid": payload.get("twilio_account_sid"),
            "twilio_auth_token": payload.get("twilio_auth_token"),
            "twilio_whatsapp_number": payload.get("twilio_whatsapp_number"),
            "updated_at": datetime.utcnow(),
            "onboarding_completed": True,
        }
        await self.db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {key: value for key, value in update_map.items() if value is not None}},
        )
        return await self.get_channel_config(tenant_id)

    def is_within_business_hours(self, tenant: dict) -> bool:
        business_hours = tenant.get("business_hours") or {}
        if not business_hours.get("enabled", True):
            return True

        timezone_name = business_hours.get("timezone", "America/Sao_Paulo")
        start_raw = business_hours.get("start", "08:00")
        end_raw = business_hours.get("end", "18:00")

        try:
            current = datetime.now(ZoneInfo(timezone_name)).time()
        except ZoneInfoNotFoundError:
            current = datetime.utcnow().time()
        start_time = self._parse_time(start_raw)
        end_time = self._parse_time(end_raw)

        if start_time <= end_time:
            return start_time <= current <= end_time
        return current >= start_time or current <= end_time

    @staticmethod
    def _parse_time(value: str) -> time:
        hour, minute = value.split(":")
        return time(hour=int(hour), minute=int(minute))

    @staticmethod
    def build_context_summary(messages: list[dict]) -> str:
        if not messages:
            return ""
        return " | ".join(f"{message['direction']}: {message['content']}" for message in messages[-4:])

    @staticmethod
    def _normalize_text(message: str) -> str:
        return message.strip().lower()

    @staticmethod
    def map_menu_selection(message: str) -> str | None:
        normalized = message.strip()
        return INTENT_MENU_MAP.get(normalized)

    def find_matching_rule(self, message: str, rules: list[dict], intent: str | None = None) -> dict | None:
        lowered = self._normalize_text(message)
        sorted_rules = sorted(rules, key=lambda rule: rule.get("priority", 100))

        menu_intent = self.map_menu_selection(message)
        for rule in sorted_rules:
            if not rule.get("active", True):
                continue

            trigger_type = rule.get("trigger_type", "keyword")
            if trigger_type == "menu" and rule.get("trigger_value") == message.strip():
                return rule
            if trigger_type == "intent" and (rule.get("intent") == (menu_intent or intent) or rule.get("trigger_value") == (menu_intent or intent)):
                return rule
            if trigger_type == "keyword" and any(keyword.lower() in lowered for keyword in rule.get("keywords", [])):
                return rule
        return None

    async def get_flow_for_intent(self, tenant_id: str, intent: str | None) -> dict | None:
        if not intent:
            return None
        flow = await self.db.automation_flows.find_one({"tenant_id": tenant_id, "intent": intent, "active": True}, sort=[("priority", 1)])
        return sanitize_mongo_document(flow)

    def build_intent_response(self, intent: str, tenant: dict, sentiment: str, context_summary: str, flow: dict | None = None) -> tuple[str, bool, str]:
        company_name = tenant["name"]
        handoff_message = tenant.get("handoff_message", DEFAULT_HANDOFF_MESSAGE)
        if flow:
            base = self.render_text(flow.get("entry_message", tenant.get("fallback_message", DEFAULT_FALLBACK_MESSAGE)), tenant)
            requires_human = bool(flow.get("requires_human", False))
            if context_summary and flow.get("fallback_message"):
                base = f"{base} {self.render_text(flow['fallback_message'], tenant)}"
            if sentiment == "negative" and intent in {"reclamacao", "suporte"}:
                return f"{base} {handoff_message}", True, "negative_sentiment_handoff"
            return base, requires_human, "intent_flow"

        intent_map = {
            "compra": f"Perfeito. Sou o assistente da {company_name} e posso ajudar com preços, orçamento, produtos e próximos passos da sua compra.",
            "suporte": f"Entendi. Vou ajudar com seu suporte na {company_name}. Me envie mais detalhes para eu direcionar melhor o atendimento.",
            "financeiro": f"Posso ajudar com assuntos financeiros da {company_name}, como boleto, cobrança, pagamento e segunda via.",
            "agendamento": f"Vamos cuidar do seu agendamento com a {company_name}. Informe o melhor dia e horário para seguirmos.",
            "reclamacao": f"Sinto muito pelo ocorrido. Vou registrar sua reclamação e priorizar uma solução com a equipe da {company_name}.",
        }
        base = intent_map.get(intent, tenant.get("fallback_message", DEFAULT_FALLBACK_MESSAGE))
        if context_summary:
            base = f"{base} Contexto recente: {context_summary[:180]}"

        requires_human = sentiment == "negative" and intent in {"reclamacao", "suporte"}
        if requires_human:
            return f"{base} {handoff_message}", True, "negative_sentiment_handoff"
        return base, False, "intent_flow"

    def build_after_hours_response(self, tenant: dict) -> tuple[str, bool, str]:
        return tenant.get("after_hours_message", DEFAULT_AFTER_HOURS_MESSAGE), False, "after_hours"

    def build_disabled_response(self) -> tuple[str, bool, str]:
        return "O bot desta empresa está desativado no momento.", False, "bot_disabled"
