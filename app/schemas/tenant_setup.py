from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TenantBillingProfileResponse(BaseModel):
    tenant_id: str
    billing_company_name: str = ""
    billing_contact_name: str = ""
    billing_contact_email: str = ""
    billing_contact_phone: str = ""
    billing_document: str = ""
    billing_address: str = ""
    selected_plan: Literal["starter", "smarter"] = "starter"
    contract_mode: Literal["self_service", "assisted", "custom"] = "assisted"
    billing_status: Literal["draft", "pending_checkout", "active", "past_due", "paused"] = "draft"
    checkout_url_override: str | None = None
    checkout_url: str | None = None
    checkout_source: Literal["tenant_override", "plan_default", "manual_quote", "not_configured"] = "not_configured"
    external_customer_id: str | None = None
    external_subscription_id: str | None = None
    legal_notes: str | None = None
    next_action: str = ""
    updated_at: datetime | None = None
    updated_by_email: str | None = None


class TenantBillingProfileUpdateRequest(BaseModel):
    billing_company_name: str | None = Field(default=None, max_length=160)
    billing_contact_name: str | None = Field(default=None, max_length=160)
    billing_contact_email: str | None = Field(default=None, max_length=160)
    billing_contact_phone: str | None = Field(default=None, max_length=40)
    billing_document: str | None = Field(default=None, max_length=40)
    billing_address: str | None = Field(default=None, max_length=240)
    selected_plan: Literal["starter", "smarter"] | None = None
    contract_mode: Literal["self_service", "assisted", "custom"] | None = None
    billing_status: Literal["draft", "pending_checkout", "active", "past_due", "paused"] | None = None
    checkout_url_override: str | None = None
    external_customer_id: str | None = Field(default=None, max_length=120)
    external_subscription_id: str | None = Field(default=None, max_length=120)
    legal_notes: str | None = Field(default=None, max_length=500)


class TenantSenderOnboardingResponse(BaseModel):
    tenant_id: str
    provider: Literal["simulation", "meta", "twilio"] = "simulation"
    setup_mode: Literal["self_service", "assisted"] = "self_service"
    status: Literal[
        "draft",
        "submitted",
        "awaiting_customer",
        "awaiting_operator",
        "awaiting_provider",
        "ready_for_validation",
        "connected",
        "rejected",
    ] = "draft"
    business_display_name: str = ""
    sender_phone_number: str = ""
    sender_country: str = "BR"
    website_url: str = ""
    use_existing_number: bool = True
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    notes: str | None = None
    provider_portal_label: str | None = None
    webhook_url: str | None = None
    requires_operator_action: bool = False
    next_action: str = ""
    last_submitted_at: datetime | None = None
    validated_at: datetime | None = None
    updated_at: datetime | None = None
    updated_by_email: str | None = None


class TenantSenderOnboardingUpdateRequest(BaseModel):
    provider: Literal["simulation", "meta", "twilio"] | None = None
    setup_mode: Literal["self_service", "assisted"] | None = None
    business_display_name: str | None = Field(default=None, max_length=160)
    sender_phone_number: str | None = Field(default=None, max_length=40)
    sender_country: str | None = Field(default=None, min_length=2, max_length=4)
    website_url: str | None = Field(default=None, max_length=240)
    use_existing_number: bool | None = None
    contact_name: str | None = Field(default=None, max_length=160)
    contact_email: str | None = Field(default=None, max_length=160)
    contact_phone: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=500)
