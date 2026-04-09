from typing import Literal

from pydantic import BaseModel, Field


class BusinessHoursConfig(BaseModel):
    enabled: bool = True
    start: str = "08:00"
    end: str = "18:00"
    timezone: str = "America/Sao_Paulo"


class BotSettingsResponse(BaseModel):
    tenant_id: str
    bot_enabled: bool = True
    business_hours: BusinessHoursConfig = Field(default_factory=BusinessHoursConfig)
    welcome_message: str
    fallback_message: str
    handoff_message: str
    after_hours_message: str


class BotSettingsUpdateRequest(BaseModel):
    bot_enabled: bool | None = None
    business_hours: BusinessHoursConfig | None = None
    welcome_message: str | None = None
    fallback_message: str | None = None
    handoff_message: str | None = None
    after_hours_message: str | None = None


class WhatsAppChannelConfigResponse(BaseModel):
    tenant_id: str
    connected: bool
    provider: Literal["simulation", "meta", "twilio"] = "simulation"
    provider_label: str = "Simulacao local"
    sandbox_mode: bool = False
    requires_assisted_setup: bool = False
    setup_stage: Literal["simulation", "connect_channel", "validate_channel", "ready"] = "simulation"
    setup_title: str = "Modo de simulacao ativo"
    setup_detail: str = "Use a simulacao para validar o fluxo antes de conectar um numero real."
    phone_number_id: str | None = None
    business_account_id: str | None = None
    api_version: str = "v21.0"
    access_token_hint: str | None = None
    twilio_account_sid_hint: str | None = None
    twilio_whatsapp_number: str | None = None
    credential_storage_mode: Literal["none", "encrypted_at_rest", "legacy_plaintext"] = "none"
    credentials_updated_at: str | None = None
    credentials_updated_by_email: str | None = None
    last_validated_at: str | None = None


class WhatsAppChannelConfigUpdateRequest(BaseModel):
    provider: Literal["simulation", "meta", "twilio"] | None = None
    phone_number_id: str | None = None
    business_account_id: str | None = None
    api_version: str | None = None
    access_token: str | None = None
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_whatsapp_number: str | None = None


class AutomationRuleRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    keywords: list[str] = Field(default_factory=list)
    intent: str | None = None
    response_template: str = Field(min_length=2)
    requires_human: bool = False
    active: bool = True
    priority: int = Field(default=100, ge=1, le=1000)
    trigger_type: Literal["keyword", "intent", "menu"] = "keyword"
    trigger_value: str | None = None


class AutomationRuleResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    keywords: list[str]
    intent: str | None = None
    response_template: str
    requires_human: bool
    active: bool
    priority: int
    trigger_type: Literal["keyword", "intent", "menu"]
    trigger_value: str | None = None
    created_at: str
    updated_at: str


class AutomationRuleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    keywords: list[str] | None = None
    intent: str | None = None
    response_template: str | None = Field(default=None, min_length=2)
    requires_human: bool | None = None
    active: bool | None = None
    priority: int | None = Field(default=None, ge=1, le=1000)
    trigger_type: Literal["keyword", "intent", "menu"] | None = None
    trigger_value: str | None = None


class AutomationFlowRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    intent: str = Field(min_length=2, max_length=60)
    description: str | None = None
    entry_message: str = Field(min_length=2)
    fallback_message: str | None = None
    requires_human: bool = False
    active: bool = True
    priority: int = Field(default=100, ge=1, le=1000)


class AutomationFlowUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    intent: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = None
    entry_message: str | None = Field(default=None, min_length=2)
    fallback_message: str | None = None
    requires_human: bool | None = None
    active: bool | None = None
    priority: int | None = Field(default=None, ge=1, le=1000)


class MessageTemplateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: Literal["marketing", "utility", "authentication", "service"] = "service"
    language: str = Field(default="pt_BR", min_length=2, max_length=20)
    body: str = Field(min_length=2)
    variables: list[str] = Field(default_factory=list)
    active: bool = True


class MessageTemplateUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: Literal["marketing", "utility", "authentication", "service"] | None = None
    language: str | None = Field(default=None, min_length=2, max_length=20)
    body: str | None = Field(default=None, min_length=2)
    variables: list[str] | None = None
    active: bool | None = None
