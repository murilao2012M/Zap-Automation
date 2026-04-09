const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ApiError = {
  detail?:
    | string
    | Array<{
        msg?: string;
        loc?: Array<string | number>;
      }>;
  message?: string;
};

function normalizeApiDetail(detail: ApiError["detail"]): string | undefined {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstError = detail[0];
    if (!firstError) {
      return undefined;
    }

    const location = Array.isArray(firstError.loc) ? firstError.loc.slice(1).join(".") : "";
    if (firstError.msg && location) {
      return `${location}: ${firstError.msg}`;
    }
    return firstError.msg;
  }

  return undefined;
}

function mapApiErrorMessage(status: number, message?: string): string {
  if (status === 401) {
    return message ?? "Sua sessao expirou ou as credenciais nao sao validas.";
  }
  if (status === 403) {
    return message ?? "Voce nao tem permissao para executar esta acao.";
  }
  if (status === 404) {
    return message ?? "O recurso solicitado nao foi encontrado.";
  }
  if (status === 409) {
    return message ?? "Ja existe um registro com esses dados.";
  }
  if (status === 423) {
    return message ?? "Seu acesso esta temporariamente bloqueado. Tente novamente em instantes.";
  }
  if (status === 429) {
    return message ?? "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.";
  }
  if (status === 503) {
    return message ?? "Estamos estabilizando nossos servicos. Tente novamente em alguns instantes.";
  }
  return message ?? "Nao foi possivel concluir a requisicao.";
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T> | ApiError;
  if (!response.ok) {
    const detail = "detail" in payload ? normalizeApiDetail(payload.detail) : undefined;
    const message = "message" in payload && payload.message ? payload.message : undefined;
    throw new Error(mapApiErrorMessage(response.status, detail ?? message));
  }

  if ("data" in payload) {
    return payload.data;
  }

  return payload as T;
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(input, init);
    return await parseJson<T>(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch") {
      throw new Error("Falha de conexao com a API. Verifique se o backend esta rodando e se o CORS esta liberado.");
    }
    throw error;
  }
}

function buildHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export type PlanFeature = {
  key: string;
  label: string;
  enabled: boolean;
  limit?: number | null;
};

export type Plan = {
  id: string;
  name: "starter" | "smarter";
  price_monthly: number;
  description: string;
  features: PlanFeature[];
  checkout_url?: string | null;
  highlight?: string | null;
};

export type SignupPayload = {
  company_name: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
  whatsapp_number?: string;
  plan_name: "starter" | "smarter";
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type UserSummary = {
  id?: string;
  tenant_id?: string;
  name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
};

export type TenantSummary = {
  id?: string;
  name?: string;
  slug?: string;
  plan_name?: string;
  status?: string;
  whatsapp_number?: string | null;
};

export type AuthResult = {
  access_token: string;
  user?: UserSummary;
  owner?: UserSummary;
  tenant?: TenantSummary;
  plan?: Plan;
};

export type RegisterUserPayload = {
  tenant_id: string;
  name: string;
  email: string;
  password: string;
  role: string;
};

export type DashboardTotals = {
  contacts: number;
  conversations: number;
  messages: number;
  human_handoffs_open: number;
};

export type DashboardResponse = {
  tenant_id: string;
  totals: DashboardTotals;
  plan: Plan;
  usage: Record<string, { used: number; limit: number | null; remaining: number | null; within_limit: boolean; usage_percent: number }>;
  commercial_alerts: string[];
  onboarding: Array<{ key: string; label: string; completed: boolean }>;
};

export type OperationEvent = {
  id: string;
  tenant_id: string;
  level: "info" | "warning" | "error";
  category: string;
  title: string;
  detail: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BusinessHours = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
};

export type BotSettings = {
  tenant_id: string;
  bot_enabled: boolean;
  business_hours: BusinessHours;
  welcome_message: string;
  fallback_message: string;
  handoff_message: string;
  after_hours_message: string;
};

export type BotSettingsPayload = Partial<BotSettings>;

export type AutomationRule = {
  id: string;
  tenant_id: string;
  name: string;
  keywords: string[];
  intent?: string | null;
  response_template: string;
  requires_human: boolean;
  active: boolean;
  priority: number;
  trigger_type: "keyword" | "intent" | "menu";
  trigger_value?: string | null;
  created_at: string;
  updated_at: string;
};

export type AutomationRulePayload = {
  name: string;
  keywords: string[];
  intent?: string | null;
  response_template: string;
  requires_human: boolean;
  active: boolean;
  priority: number;
  trigger_type: "keyword" | "intent" | "menu";
  trigger_value?: string | null;
};

export type AutomationFlow = {
  id: string;
  tenant_id: string;
  name: string;
  intent: string;
  description?: string | null;
  entry_message: string;
  fallback_message?: string | null;
  requires_human: boolean;
  active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type AutomationFlowPayload = {
  name: string;
  intent: string;
  description?: string | null;
  entry_message: string;
  fallback_message?: string | null;
  requires_human: boolean;
  active: boolean;
  priority: number;
};

export type MessageTemplate = {
  id: string;
  tenant_id: string;
  name: string;
  category: "marketing" | "utility" | "authentication" | "service";
  language: string;
  body: string;
  variables: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MessageTemplatePayload = {
  name: string;
  category: "marketing" | "utility" | "authentication" | "service";
  language: string;
  body: string;
  variables: string[];
  active: boolean;
};

export type WhatsAppChannelConfig = {
  tenant_id: string;
  connected: boolean;
  provider: "simulation" | "meta" | "twilio";
  provider_label: string;
  sandbox_mode: boolean;
  requires_assisted_setup: boolean;
  setup_stage: "simulation" | "connect_channel" | "validate_channel" | "ready";
  setup_title: string;
  setup_detail: string;
  phone_number_id?: string | null;
  business_account_id?: string | null;
  api_version: string;
  access_token_hint?: string | null;
  twilio_account_sid_hint?: string | null;
  twilio_whatsapp_number?: string | null;
  credential_storage_mode: "none" | "encrypted_at_rest" | "legacy_plaintext";
  credentials_updated_at?: string | null;
  credentials_updated_by_email?: string | null;
  last_validated_at?: string | null;
};

export type WhatsAppChannelConfigPayload = {
  provider?: "simulation" | "meta" | "twilio";
  phone_number_id?: string;
  business_account_id?: string;
  api_version?: string;
  access_token?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_whatsapp_number?: string;
};

export type TenantBillingProfile = {
  tenant_id: string;
  billing_company_name: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_contact_phone: string;
  billing_document: string;
  billing_address: string;
  selected_plan: "starter" | "smarter";
  contract_mode: "self_service" | "assisted" | "custom";
  billing_status: "draft" | "pending_checkout" | "active" | "past_due" | "paused";
  checkout_url_override?: string | null;
  checkout_url?: string | null;
  checkout_source: "tenant_override" | "plan_default" | "manual_quote" | "not_configured";
  external_customer_id?: string | null;
  external_subscription_id?: string | null;
  legal_notes?: string | null;
  next_action: string;
  updated_at?: string | null;
  updated_by_email?: string | null;
};

export type TenantBillingProfilePayload = Partial<
  Omit<TenantBillingProfile, "tenant_id" | "checkout_url" | "checkout_source" | "next_action" | "updated_at" | "updated_by_email">
>;

export type TenantSenderOnboarding = {
  tenant_id: string;
  provider: "simulation" | "meta" | "twilio";
  setup_mode: "self_service" | "assisted";
  status:
    | "draft"
    | "submitted"
    | "awaiting_customer"
    | "awaiting_operator"
    | "awaiting_provider"
    | "ready_for_validation"
    | "connected"
    | "rejected";
  business_display_name: string;
  sender_phone_number: string;
  sender_country: string;
  website_url: string;
  use_existing_number: boolean;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes?: string | null;
  provider_portal_label?: string | null;
  webhook_url?: string | null;
  requires_operator_action: boolean;
  next_action: string;
  last_submitted_at?: string | null;
  validated_at?: string | null;
  updated_at?: string | null;
  updated_by_email?: string | null;
};

export type TenantSenderOnboardingPayload = Partial<
  Omit<
    TenantSenderOnboarding,
    | "tenant_id"
    | "status"
    | "provider_portal_label"
    | "webhook_url"
    | "requires_operator_action"
    | "next_action"
    | "last_submitted_at"
    | "validated_at"
    | "updated_at"
    | "updated_by_email"
  >
>;

export type HealthResponse = {
  tenant_id: string;
  health_score: number;
  status: string;
  factors: Record<string, number>;
  alerts: string[];
};

export type ConversationSummary = {
  id: string;
  tenant_id: string;
  contact_id: string;
  status: "bot" | "human" | "closed";
  channel: string;
  sentiment: "positive" | "neutral" | "negative";
  summary?: string | null;
  current_intent?: string | null;
  handoff_reason?: string | null;
  last_bot_action?: string | null;
  last_message_at?: string | null;
  updated_at?: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  last_message_preview?: string | null;
};

export type ConversationMessage = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  contact_id: string;
  direction: "incoming" | "outgoing";
  content: string;
  message_type: string;
  intent?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ManualConversationReplyPayload = {
  content: string;
  message_type?: string;
};

export type WebhookPayload = {
  tenant_id: string;
  phone: string;
  contact_name?: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type LocalMetaWebhookSimulationPayload = {
  tenant_id: string;
  phone: string;
  contact_name?: string;
  message: string;
  phone_number_id?: string;
  display_phone_number?: string;
};

export type WebhookResult = {
  tenant_id: string;
  conversation_id: string;
  contact_id: string;
  incoming_message_id: string;
  detected_intent: string;
  sentiment: string;
  automation_triggered: boolean;
  response: string;
  handoff_to_human: boolean;
};

export type VerifyWebhookPayload = {
  mode: string;
  challenge: string;
  verifyToken: string;
};

export async function getPlans(): Promise<Plan[]> {
  return requestJson<Plan[]>(`${API_URL}/api/v1/catalog/plans`, {
    cache: "no-store",
  });
}

export async function signup(payload: SignupPayload): Promise<AuthResult> {
  return requestJson<AuthResult>(`${API_URL}/api/v1/auth/signup`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  return requestJson<{ access_token: string; user: UserSummary }>(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload: RegisterUserPayload, token: string): Promise<UserSummary> {
  return requestJson<UserSummary>(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getMe(token: string): Promise<UserSummary> {
  return requestJson<UserSummary>(`${API_URL}/api/v1/admin/me`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function getTenantDashboard(tenantId: string, token: string): Promise<DashboardResponse> {
  return requestJson<DashboardResponse>(`${API_URL}/api/v1/admin/tenants/${tenantId}/dashboard`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function getTenantHealth(tenantId: string, token: string): Promise<HealthResponse> {
  return requestJson<HealthResponse>(`${API_URL}/api/v1/admin/tenants/${tenantId}/health`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function getTenantBillingProfile(tenantId: string, token: string): Promise<TenantBillingProfile> {
  return requestJson<TenantBillingProfile>(`${API_URL}/api/v1/admin/tenants/${tenantId}/billing`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function updateTenantBillingProfile(
  tenantId: string,
  token: string,
  payload: TenantBillingProfilePayload,
): Promise<TenantBillingProfile> {
  return requestJson<TenantBillingProfile>(`${API_URL}/api/v1/admin/tenants/${tenantId}/billing`, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getTenantSenderOnboarding(tenantId: string, token: string): Promise<TenantSenderOnboarding> {
  return requestJson<TenantSenderOnboarding>(`${API_URL}/api/v1/admin/tenants/${tenantId}/sender-onboarding`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function updateTenantSenderOnboarding(
  tenantId: string,
  token: string,
  payload: TenantSenderOnboardingPayload,
): Promise<TenantSenderOnboarding> {
  return requestJson<TenantSenderOnboarding>(`${API_URL}/api/v1/admin/tenants/${tenantId}/sender-onboarding`, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function submitTenantSenderOnboarding(tenantId: string, token: string): Promise<TenantSenderOnboarding> {
  return requestJson<TenantSenderOnboarding>(`${API_URL}/api/v1/admin/tenants/${tenantId}/sender-onboarding/submit`, {
    method: "POST",
    headers: buildHeaders(token),
  });
}

export async function validateTenantSenderOnboarding(tenantId: string, token: string): Promise<TenantSenderOnboarding> {
  return requestJson<TenantSenderOnboarding>(`${API_URL}/api/v1/admin/tenants/${tenantId}/sender-onboarding/validate`, {
    method: "POST",
    headers: buildHeaders(token),
  });
}

export async function getBotSettings(tenantId: string, token: string): Promise<BotSettings> {
  return requestJson<BotSettings>(`${API_URL}/api/v1/automation/tenants/${tenantId}/settings`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function updateBotSettings(tenantId: string, token: string, payload: BotSettingsPayload): Promise<BotSettings> {
  return requestJson<BotSettings>(`${API_URL}/api/v1/automation/tenants/${tenantId}/settings`, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getAutomationRules(tenantId: string, token: string): Promise<AutomationRule[]> {
  return requestJson<AutomationRule[]>(`${API_URL}/api/v1/automation/tenants/${tenantId}/rules`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function createAutomationRule(tenantId: string, token: string, payload: AutomationRulePayload): Promise<AutomationRule> {
  return requestJson<AutomationRule>(`${API_URL}/api/v1/automation/tenants/${tenantId}/rules`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getAutomationFlows(tenantId: string, token: string): Promise<AutomationFlow[]> {
  return requestJson<AutomationFlow[]>(`${API_URL}/api/v1/automation/tenants/${tenantId}/flows`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function createAutomationFlow(tenantId: string, token: string, payload: AutomationFlowPayload): Promise<AutomationFlow> {
  return requestJson<AutomationFlow>(`${API_URL}/api/v1/automation/tenants/${tenantId}/flows`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function updateAutomationFlow(
  tenantId: string,
  flowId: string,
  token: string,
  payload: Partial<AutomationFlowPayload>,
): Promise<AutomationFlow> {
  return requestJson<AutomationFlow>(`${API_URL}/api/v1/automation/tenants/${tenantId}/flows/${flowId}`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getMessageTemplates(tenantId: string, token: string): Promise<MessageTemplate[]> {
  return requestJson<MessageTemplate[]>(`${API_URL}/api/v1/automation/tenants/${tenantId}/templates`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function createMessageTemplate(tenantId: string, token: string, payload: MessageTemplatePayload): Promise<MessageTemplate> {
  return requestJson<MessageTemplate>(`${API_URL}/api/v1/automation/tenants/${tenantId}/templates`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function updateMessageTemplate(
  tenantId: string,
  templateId: string,
  token: string,
  payload: Partial<MessageTemplatePayload>,
): Promise<MessageTemplate> {
  return requestJson<MessageTemplate>(`${API_URL}/api/v1/automation/tenants/${tenantId}/templates/${templateId}`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getWhatsAppChannelConfig(tenantId: string, token: string): Promise<WhatsAppChannelConfig> {
  return requestJson<WhatsAppChannelConfig>(`${API_URL}/api/v1/automation/tenants/${tenantId}/channel`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function updateWhatsAppChannelConfig(
  tenantId: string,
  token: string,
  payload: WhatsAppChannelConfigPayload,
): Promise<WhatsAppChannelConfig> {
  return requestJson<WhatsAppChannelConfig>(`${API_URL}/api/v1/automation/tenants/${tenantId}/channel`, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function updateAutomationRule(
  tenantId: string,
  ruleId: string,
  token: string,
  payload: Partial<AutomationRulePayload>,
): Promise<AutomationRule> {
  return requestJson<AutomationRule>(`${API_URL}/api/v1/automation/tenants/${tenantId}/rules/${ruleId}`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getConversations(
  tenantId: string,
  token: string,
  filters?: { status?: string; intent?: string; search?: string },
): Promise<ConversationSummary[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.intent) params.set("intent", filters.intent);
  if (filters?.search) params.set("search", filters.search);
  const suffix = params.size ? `?${params.toString()}` : "";
  return requestJson<ConversationSummary[]>(`${API_URL}/api/v1/admin/tenants/${tenantId}/conversations${suffix}`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function getConversationMessages(tenantId: string, conversationId: string, token: string): Promise<ConversationMessage[]> {
  return requestJson<ConversationMessage[]>(`${API_URL}/api/v1/admin/tenants/${tenantId}/conversations/${conversationId}/messages`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function getOperationEvents(tenantId: string, token: string): Promise<OperationEvent[]> {
  return requestJson<OperationEvent[]>(`${API_URL}/api/v1/admin/tenants/${tenantId}/operations/events`, {
    headers: buildHeaders(token),
    cache: "no-store",
  });
}

export async function handoffConversation(tenantId: string, conversationId: string, token: string): Promise<ConversationSummary> {
  return requestJson<ConversationSummary>(`${API_URL}/api/v1/admin/tenants/${tenantId}/conversations/${conversationId}/handoff`, {
    method: "POST",
    headers: buildHeaders(token),
  });
}

export async function resumeConversation(tenantId: string, conversationId: string, token: string): Promise<ConversationSummary> {
  return requestJson<ConversationSummary>(`${API_URL}/api/v1/admin/tenants/${tenantId}/conversations/${conversationId}/resume`, {
    method: "POST",
    headers: buildHeaders(token),
  });
}

export async function sendManualConversationReply(
  tenantId: string,
  conversationId: string,
  token: string,
  payload: ManualConversationReplyPayload,
): Promise<ConversationSummary> {
  return requestJson<ConversationSummary>(`${API_URL}/api/v1/admin/tenants/${tenantId}/conversations/${conversationId}/reply`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function sendWebhookMessage(payload: WebhookPayload): Promise<WebhookResult> {
  return requestJson<WebhookResult>(`${API_URL}/api/v1/webhook/whatsapp`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function simulateLocalMetaWebhook(payload: LocalMetaWebhookSimulationPayload): Promise<{
  processed_messages: number;
  processed_status_updates: number;
  results: WebhookResult[];
}> {
  return requestJson(`${API_URL}/api/v1/webhook/whatsapp/dev/meta-sample`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function verifyWebhook(payload: VerifyWebhookPayload): Promise<number> {
  const params = new URLSearchParams({
    "hub.mode": payload.mode,
    "hub.challenge": payload.challenge,
    "hub.verify_token": payload.verifyToken,
  });

  return requestJson<number>(`${API_URL}/api/v1/webhook/whatsapp?${params.toString()}`, {
    cache: "no-store",
  });
}

export { API_URL };
