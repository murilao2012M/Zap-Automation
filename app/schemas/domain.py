from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import DatabaseModel


class PlanFeature(BaseModel):
    key: str
    label: str
    enabled: bool = True
    limit: int | None = None


class Plan(DatabaseModel):
    name: Literal["starter", "smarter"]
    price_monthly: float
    description: str
    features: list[PlanFeature]
    checkout_url: str | None = None
    highlight: str | None = None


class Tenant(DatabaseModel):
    name: str
    slug: str
    plan_name: Literal["starter", "smarter"] = "starter"
    status: Literal["active", "inactive", "trial"] = "trial"
    channel_provider: Literal["simulation", "meta", "twilio"] = "simulation"
    whatsapp_number: str | None = None
    ai_enabled: bool = True
    bot_enabled: bool = True
    business_hours: dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": True,
            "start": "08:00",
            "end": "18:00",
            "timezone": "America/Sao_Paulo",
        }
    )
    welcome_message: str = "Olá! Sou o assistente virtual da empresa. Como posso ajudar você hoje?"
    fallback_message: str = "Entendi sua mensagem. Posso ajudar com compras, suporte, financeiro ou agendamento."
    handoff_message: str = "Vou encaminhar sua conversa para um atendente humano."
    after_hours_message: str = "Nosso atendimento está fora do horário no momento. Deixe sua mensagem e retornaremos no próximo período útil."
    meta_access_token: str | None = None
    meta_phone_number_id: str | None = None
    meta_business_account_id: str | None = None
    meta_api_version: str = "v21.0"
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_whatsapp_number: str | None = None
    onboarding_completed: bool = False


class User(DatabaseModel):
    tenant_id: str
    name: str
    email: str
    password_hash: str
    role: Literal["owner", "admin", "agent", "viewer"] = "admin"
    is_active: bool = True
    token_version: int = 1
    failed_login_attempts: int = 0
    locked_until: datetime | None = None
    last_login_at: datetime | None = None


class Contact(DatabaseModel):
    tenant_id: str
    name: str | None = None
    phone: str
    tags: list[str] = Field(default_factory=list)
    last_intent: str | None = None


class Conversation(DatabaseModel):
    tenant_id: str
    contact_id: str
    status: Literal["bot", "human", "closed"] = "bot"
    channel: str = "whatsapp"
    last_message_at: str | None = None
    sentiment: Literal["positive", "neutral", "negative"] = "neutral"
    summary: str | None = None
    current_intent: str | None = None
    handoff_reason: str | None = None
    last_bot_action: str | None = None


class Message(DatabaseModel):
    tenant_id: str
    conversation_id: str
    contact_id: str
    direction: Literal["incoming", "outgoing"]
    content: str
    message_type: Literal["text", "image", "template", "interactive"] = "text"
    intent: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AutomationRule(DatabaseModel):
    tenant_id: str
    name: str
    keywords: list[str] = Field(default_factory=list)
    intent: str | None = None
    response_template: str
    requires_human: bool = False
    active: bool = True
    priority: int = 100
    trigger_type: Literal["keyword", "intent", "menu"] = "keyword"
    trigger_value: str | None = None


class AutomationFlow(DatabaseModel):
    tenant_id: str
    name: str
    intent: str
    description: str | None = None
    entry_message: str
    fallback_message: str | None = None
    requires_human: bool = False
    active: bool = True
    priority: int = 100


class MessageTemplate(DatabaseModel):
    tenant_id: str
    name: str
    category: Literal["marketing", "utility", "authentication", "service"] = "service"
    language: str = "pt_BR"
    body: str
    variables: list[str] = Field(default_factory=list)
    active: bool = True


class AIInsight(DatabaseModel):
    tenant_id: str
    conversation_id: str
    intent: str
    sentiment: Literal["positive", "neutral", "negative"]
    suggested_reply: str
    confidence: float


class HealthScore(DatabaseModel):
    tenant_id: str
    health_score: int
    status: Literal["critico", "alerta", "bom", "excelente"]
    factors: dict[str, int]
    alerts: list[str]
