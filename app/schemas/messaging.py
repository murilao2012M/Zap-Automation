from typing import Any

from pydantic import BaseModel, Field


class WhatsAppWebhookPayload(BaseModel):
    tenant_id: str
    phone: str
    contact_name: str | None = None
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SendMessageRequest(BaseModel):
    tenant_id: str
    contact_id: str
    conversation_id: str
    content: str
    message_type: str = "text"


class ManualConversationReplyRequest(BaseModel):
    content: str
    message_type: str = "text"


class LocalMetaWebhookSimulationRequest(BaseModel):
    tenant_id: str
    phone: str
    contact_name: str | None = None
    message: str
    phone_number_id: str = "local-dev-phone-number-id"
    display_phone_number: str = "15550000000"


class MessageProcessResult(BaseModel):
    tenant_id: str
    conversation_id: str
    contact_id: str
    incoming_message_id: str
    detected_intent: str
    confidence: float
    sentiment: str
    automation_triggered: bool
    response: str
    handoff_to_human: bool
    matched_rule: str | None = None
    routing_reason: str | None = None
