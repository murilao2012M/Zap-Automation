"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type AutomationFlow,
  type AutomationFlowPayload,
  type AutomationRule,
  type AutomationRulePayload,
  type BotSettings,
  type ConversationMessage,
  type ConversationSummary,
  type DashboardResponse,
  type HealthResponse,
  type MessageTemplate,
  type MessageTemplatePayload,
  type Plan,
  type RegisterUserPayload,
  type LocalMetaWebhookSimulationPayload,
  type UserSummary,
  type VerifyWebhookPayload,
  type WebhookPayload,
  type WebhookResult,
  type WhatsAppChannelConfig,
  type WhatsAppChannelConfigPayload,
  type OperationEvent,
  createAutomationFlow,
  createAutomationRule,
  createMessageTemplate,
  getAutomationRules,
  getAutomationFlows,
  getBotSettings,
  getConversationMessages,
  getConversations,
  getMe,
  getMessageTemplates,
  getOperationEvents,
  getPlans,
  getTenantDashboard,
  getTenantHealth,
  getWhatsAppChannelConfig,
  handoffConversation,
  registerUser,
  resumeConversation,
  sendManualConversationReply,
  simulateLocalMetaWebhook,
  sendWebhookMessage,
  updateAutomationFlow,
  updateAutomationRule,
  updateBotSettings,
  updateMessageTemplate,
  updateWhatsAppChannelConfig,
  verifyWebhook,
} from "@/lib/api";
import {
  FlowEditorPanel,
  FlowLibraryPanel,
  TemplateEditorPanel,
  TemplateLibraryPanel,
} from "@/components/automation-assets-panel";
import { clearSession, getSessionState, persistSession } from "@/lib/auth";
import { BotSettingsPanel } from "@/components/bot-settings-panel";
import { ConversationsPanel } from "@/components/conversations-panel";
import { DashboardOverview } from "@/components/dashboard-overview";
import { OperationsPanel } from "@/components/operations-panel";
import { RulesManagerPanel, formatRuleFormValue } from "@/components/rules-manager-panel";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

type SectionId = "overview" | "automation" | "conversations" | "operations";

const sections: Array<{ id: SectionId; label: string; description: string; icon: string }> = [
  { id: "overview", label: "Visão Geral", description: "Saúde e desempenho", icon: "01" },
  { id: "automation", label: "Automação", description: "Regras e configuração", icon: "02" },
  { id: "conversations", label: "Conversas", description: "Inbox e handoff", icon: "03" },
  { id: "operations", label: "Operações", description: "Equipe e canal", icon: "04" },
];

const defaultTeamForm: Omit<RegisterUserPayload, "tenant_id"> = {
  name: "",
  email: "",
  password: "",
  role: "agent",
};

const defaultVerifyForm: VerifyWebhookPayload = {
  mode: "subscribe",
  challenge: "123456",
  verifyToken: "meta-verify-token",
};

const defaultRuleForm: AutomationRulePayload = {
  name: "",
  keywords: [],
  intent: null,
  response_template: "",
  requires_human: false,
  active: true,
  priority: 50,
  trigger_type: "keyword",
  trigger_value: "",
};

const defaultFlowForm: AutomationFlowPayload = {
  name: "",
  intent: "",
  description: "",
  entry_message: "",
  fallback_message: "",
  requires_human: false,
  active: true,
  priority: 50,
};

const defaultTemplateForm: MessageTemplatePayload = {
  name: "",
  category: "service",
  language: "pt_BR",
  body: "",
  variables: [],
  active: true,
};

const defaultChannelForm: WhatsAppChannelConfigPayload = {
  provider: "simulation",
  phone_number_id: "",
  business_account_id: "",
  api_version: "v21.0",
  access_token: "",
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_whatsapp_number: "",
};

function defaultLocalMetaForm(tenantId: string): LocalMetaWebhookSimulationPayload {
  return {
    tenant_id: tenantId,
    phone: "5511999999999",
    contact_name: "Cliente Meta Local",
    message: "Oi, vim do webhook da Meta local",
    phone_number_id: "local-dev-phone-number-id",
    display_phone_number: "15550000000",
  };
}

function defaultWebhookForm(tenantId: string): WebhookPayload {
  return {
    tenant_id: tenantId,
    phone: "5511999999999",
    contact_name: "Cliente Teste",
    message: "menu",
    metadata: { source: "frontend_dashboard" },
  };
}

function formatChannelSummary(provider?: string | null): { title: string; detail: string } {
  switch (provider) {
    case "twilio":
      return { title: "Twilio WhatsApp", detail: "Canal conectado para mensagens reais." };
    case "meta":
      return { title: "Meta Cloud API", detail: "Integração oficial configurada no painel." };
    case "simulation":
    default:
      return { title: "Simulação local", detail: "Ambiente seguro para testes e validação." };
  }
}

function formatPlanSummary(planName?: string | null): { title: string; detail: string } {
  const normalized = (planName ?? "trial").trim();

  switch (normalized.toLowerCase()) {
    case "starter":
      return { title: "Starter", detail: "Plano inicial para operações em crescimento." };
    case "trial":
      return { title: "Trial", detail: "Ambiente de avaliação com recursos essenciais." };
    default:
      return { title: normalized, detail: "Plano ativo vinculado a este painel." };
  }
}

function emptyBotSettings(): BotSettings {
  return {
    tenant_id: "",
    bot_enabled: true,
    business_hours: {
      enabled: true,
      start: "08:00",
      end: "18:00",
      timezone: "America/Sao_Paulo",
    },
    welcome_message: "",
    fallback_message: "",
    handoff_message: "",
    after_hours_message: "",
  };
}

export function DashboardShell() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [me, setMe] = useState<UserSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [botSettings, setBotSettings] = useState<BotSettings>(emptyBotSettings());
  const [channelConfig, setChannelConfig] = useState<WhatsAppChannelConfig | null>(null);
  const [operationEvents, setOperationEvents] = useState<OperationEvent[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadError, setLoadError] = useState("");

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState("");

  const [ruleForm, setRuleForm] = useState<AutomationRulePayload>(defaultRuleForm);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleFeedback, setRuleFeedback] = useState("");
  const [ruleError, setRuleError] = useState("");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [flowForm, setFlowForm] = useState<AutomationFlowPayload>(defaultFlowForm);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<MessageTemplatePayload>(defaultTemplateForm);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [assetsSaving, setAssetsSaving] = useState(false);
  const [assetsFeedback, setAssetsFeedback] = useState("");
  const [assetsError, setAssetsError] = useState("");

  const [teamForm, setTeamForm] = useState(defaultTeamForm);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamResult, setTeamResult] = useState<UserSummary | null>(null);
  const [teamError, setTeamError] = useState("");

  const [webhookForm, setWebhookForm] = useState<WebhookPayload>(defaultWebhookForm(""));
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<WebhookResult | null>(null);
  const [webhookError, setWebhookError] = useState("");
  const [localMetaForm, setLocalMetaForm] = useState<LocalMetaWebhookSimulationPayload>(defaultLocalMetaForm(""));
  const [localMetaLoading, setLocalMetaLoading] = useState(false);
  const [localMetaResult, setLocalMetaResult] = useState<{ processed_messages: number; processed_status_updates: number; results: WebhookResult[] } | null>(null);
  const [localMetaError, setLocalMetaError] = useState("");

  const [verifyForm, setVerifyForm] = useState<VerifyWebhookPayload>(defaultVerifyForm);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<number | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [channelForm, setChannelForm] = useState<WhatsAppChannelConfigPayload>(defaultChannelForm);
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelFeedback, setChannelFeedback] = useState("");
  const [conversationFilters, setConversationFilters] = useState<{ status: "all" | "bot" | "human" | "closed"; intent: string; search: string }>({
    status: "all",
    intent: "",
    search: "",
  });
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState("");
  const [replyError, setReplyError] = useState("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(15);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const selectedPlan = useMemo(() => {
    const session = getSessionState();
    return plans.find((plan) => plan.name === session.tenant?.plan_name) ?? null;
  }, [plans]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const matchesStatus = conversationFilters.status === "all" || conversation.status === conversationFilters.status;
      const matchesIntent =
        !conversationFilters.intent ||
        (conversation.current_intent ?? "").toLowerCase() === conversationFilters.intent.toLowerCase();
      const haystack = `${conversation.contact_name ?? ""} ${conversation.contact_phone ?? ""} ${conversation.last_message_preview ?? ""}`.toLowerCase();
      const matchesSearch = !conversationFilters.search || haystack.includes(conversationFilters.search.toLowerCase());
      return matchesStatus && matchesIntent && matchesSearch;
    });
  }, [conversationFilters, conversations]);

  const currentSection = sections.find((section) => section.id === activeSection) ?? sections[0];
  const planSummary = formatPlanSummary(selectedPlan?.name ?? getSessionState().tenant?.plan_name ?? "trial");
  const channelSummary = formatChannelSummary(channelConfig?.provider ?? "simulation");
  const responsibleName = me?.name ?? "Equipe não identificada";
  const responsibleDetail = me?.email ?? "Responsável principal pela operação.";

  const recentActivities = useMemo(() => {
    return conversations
      .slice(0, 5)
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.contact_name ?? "Contato sem nome",
        description: conversation.last_message_preview ?? "Sem mensagem recente.",
        meta: `${conversation.status} | ${conversation.current_intent ?? "sem intent"}`,
      }));
  }, [conversations]);

  async function loadEverything(currentToken: string, currentTenantId: string) {
    const [meData, dashboardData, healthData, plansData, settingsData, channelData, rulesData, flowsData, templatesData, conversationsData, operationEventsData] = await Promise.all([
      getMe(currentToken),
      getTenantDashboard(currentTenantId, currentToken),
      getTenantHealth(currentTenantId, currentToken),
      getPlans(),
      getBotSettings(currentTenantId, currentToken),
      getWhatsAppChannelConfig(currentTenantId, currentToken),
      getAutomationRules(currentTenantId, currentToken),
      getAutomationFlows(currentTenantId, currentToken),
      getMessageTemplates(currentTenantId, currentToken),
      getConversations(currentTenantId, currentToken, conversationFilters),
      getOperationEvents(currentTenantId, currentToken),
    ]);

    setMe(meData);
    persistSession({ token: currentToken, user: meData });
    setDashboard(dashboardData);
    setHealth(healthData);
    setPlans(plansData);
    setBotSettings(settingsData);
    setChannelConfig(channelData);
    setOperationEvents(operationEventsData);
    setChannelForm({
      provider: channelData.provider ?? "simulation",
      phone_number_id: channelData.phone_number_id ?? "",
      business_account_id: channelData.business_account_id ?? "",
      api_version: channelData.api_version ?? "v21.0",
      access_token: "",
      twilio_account_sid: "",
      twilio_auth_token: "",
      twilio_whatsapp_number: channelData.twilio_whatsapp_number ?? "",
    });
    setRules(rulesData);
    setFlows(flowsData);
    setTemplates(templatesData);
    setConversations(conversationsData);
    setSelectedConversationId((current) => current ?? conversationsData[0]?.id ?? null);
  }

  async function loadConversationMessages(currentToken: string, currentTenantId: string, conversationId: string) {
    setMessages(await getConversationMessages(currentTenantId, conversationId, currentToken));
  }

  async function refreshAll() {
    if (!token || !tenantId) return;
    await loadEverything(token, tenantId);
  }

  async function refreshConversationsOnly() {
    if (!token || !tenantId) return;
    const data = await getConversations(tenantId, token, conversationFilters);
    setConversations(data);
    const hasSelectedConversation = selectedConversationId && data.some((conversation) => conversation.id === selectedConversationId);
    const targetConversationId = hasSelectedConversation ? selectedConversationId : data[0]?.id ?? null;
    setSelectedConversationId(targetConversationId);
    if (targetConversationId) {
      await loadConversationMessages(token, tenantId, targetConversationId);
    } else {
      setMessages([]);
    }
  }

  useEffect(() => {
    const session = getSessionState();
    if (!session.token || !session.tenantId) {
      setBooting(false);
      router.replace("/");
      return;
    }

    setToken(session.token);
    setTenantId(session.tenantId);
    setWebhookForm(defaultWebhookForm(session.tenantId));
    setLocalMetaForm(defaultLocalMetaForm(session.tenantId));

    void loadEverything(session.token, session.tenantId)
      .catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar o painel.");
      })
      .finally(() => setBooting(false));
  }, [router]);

  useEffect(() => {
    if (!token || !tenantId || !selectedConversationId) {
      setMessages([]);
      return;
    }

    void loadConversationMessages(token, tenantId, selectedConversationId);
  }, [token, tenantId, selectedConversationId]);

  useEffect(() => {
    setReplyDraft("");
    setReplyFeedback("");
    setReplyError("");
  }, [selectedConversationId]);

  useEffect(() => {
    if (!token || !tenantId) {
      return;
    }
    void refreshConversationsOnly().catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : "Não foi possível filtrar as conversas.");
    });
  }, [conversationFilters.status, conversationFilters.intent, conversationFilters.search]);

  useEffect(() => {
    if (!token || !tenantId || !autoRefreshEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshConversationsOnly().catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Não foi possível atualizar as conversas automaticamente.");
      });
    }, refreshIntervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, refreshIntervalSeconds, token, tenantId, selectedConversationId]);

  function handleLogout() {
    clearSession();
    router.replace("/");
  }

  async function handleSettingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;

    setSettingsSaving(true);
    setSettingsFeedback("");

    try {
      const updated = await updateBotSettings(tenantId, token, {
        bot_enabled: botSettings.bot_enabled,
        business_hours: botSettings.business_hours,
        welcome_message: botSettings.welcome_message,
        fallback_message: botSettings.fallback_message,
        handoff_message: botSettings.handoff_message,
        after_hours_message: botSettings.after_hours_message,
      });
      setBotSettings(updated);
      setSettingsFeedback("Configurações do bot salvas com sucesso.");
    } catch (error) {
      setSettingsFeedback(error instanceof Error ? error.message : "Não foi possível salvar as configurações.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;

    setRuleSaving(true);
    setRuleError("");
    setRuleFeedback("");

    try {
      const created = await createAutomationRule(tenantId, token, {
        ...ruleForm,
        intent: ruleForm.intent || null,
        trigger_value: ruleForm.trigger_value || null,
      });
      setRules((current) => [...current, created].sort((a, b) => a.priority - b.priority));
      setRuleForm(defaultRuleForm);
      setEditingRuleId(null);
      setRuleFeedback("Regra criada com sucesso.");
    } catch (error) {
      setRuleError(error instanceof Error ? error.message : "Não foi possível criar a regra.");
    } finally {
      setRuleSaving(false);
    }
  }

  async function handleUpdateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId || !editingRuleId) return;

    setRuleSaving(true);
    setRuleError("");
    setRuleFeedback("");

    try {
      const updated = await updateAutomationRule(tenantId, editingRuleId, token, {
        ...ruleForm,
        intent: ruleForm.intent || null,
        trigger_value: ruleForm.trigger_value || null,
      });
      setRules((current) => current.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.priority - b.priority));
      setRuleForm(defaultRuleForm);
      setEditingRuleId(null);
      setRuleFeedback("Regra atualizada com sucesso.");
    } catch (error) {
      setRuleError(error instanceof Error ? error.message : "Não foi possível atualizar a regra.");
    } finally {
      setRuleSaving(false);
    }
  }

  async function handleCreateFlow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;

    setAssetsSaving(true);
    setAssetsError("");
    setAssetsFeedback("");

    try {
      const created = await createAutomationFlow(tenantId, token, flowForm);
      setFlows((current) => [...current, created].sort((a, b) => a.priority - b.priority));
      setFlowForm(defaultFlowForm);
      setEditingFlowId(null);
      await refreshAll();
      setAssetsFeedback("Fluxo criado com sucesso.");
    } catch (error) {
      setAssetsError(error instanceof Error ? error.message : "Não foi possível criar o fluxo.");
    } finally {
      setAssetsSaving(false);
    }
  }

  async function handleUpdateFlow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId || !editingFlowId) return;

    setAssetsSaving(true);
    setAssetsError("");
    setAssetsFeedback("");

    try {
      const updated = await updateAutomationFlow(tenantId, editingFlowId, token, flowForm);
      setFlows((current) => current.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.priority - b.priority));
      setFlowForm(defaultFlowForm);
      setEditingFlowId(null);
      await refreshAll();
      setAssetsFeedback("Fluxo atualizado com sucesso.");
    } catch (error) {
      setAssetsError(error instanceof Error ? error.message : "Não foi possível atualizar o fluxo.");
    } finally {
      setAssetsSaving(false);
    }
  }

  async function handleCreateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;

    setAssetsSaving(true);
    setAssetsError("");
    setAssetsFeedback("");

    try {
      const created = await createMessageTemplate(tenantId, token, templateForm);
      setTemplates((current) => [created, ...current]);
      setTemplateForm(defaultTemplateForm);
      setEditingTemplateId(null);
      await refreshAll();
      setAssetsFeedback("Template criado com sucesso.");
    } catch (error) {
      setAssetsError(error instanceof Error ? error.message : "Não foi possível criar o template.");
    } finally {
      setAssetsSaving(false);
    }
  }

  async function handleUpdateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId || !editingTemplateId) return;

    setAssetsSaving(true);
    setAssetsError("");
    setAssetsFeedback("");

    try {
      const updated = await updateMessageTemplate(tenantId, editingTemplateId, token, templateForm);
      setTemplates((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setTemplateForm(defaultTemplateForm);
      setEditingTemplateId(null);
      await refreshAll();
      setAssetsFeedback("Template atualizado com sucesso.");
    } catch (error) {
      setAssetsError(error instanceof Error ? error.message : "Não foi possível atualizar o template.");
    } finally {
      setAssetsSaving(false);
    }
  }

  async function handleToggleRule(rule: AutomationRule) {
    if (!token || !tenantId) return;

    try {
      const updated = await updateAutomationRule(tenantId, rule.id, token, { active: !rule.active });
      setRules((current) => current.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.priority - b.priority));
    } catch (error) {
      setRuleError(error instanceof Error ? error.message : "Não foi possível atualizar a regra.");
    }
  }

  function handleEditRule(rule: AutomationRule) {
    setEditingRuleId(rule.id);
    setRuleForm(formatRuleFormValue(rule));
    setRuleFeedback("");
    setRuleError("");
    setActiveSection("automation");
  }

  function handleCancelRuleEdit() {
    setEditingRuleId(null);
    setRuleForm(defaultRuleForm);
    setRuleFeedback("");
    setRuleError("");
  }

  function handleEditFlow(flow: AutomationFlow) {
    setEditingFlowId(flow.id);
    setFlowForm({
      name: flow.name,
      intent: flow.intent,
      description: flow.description ?? "",
      entry_message: flow.entry_message,
      fallback_message: flow.fallback_message ?? "",
      requires_human: flow.requires_human,
      active: flow.active,
      priority: flow.priority,
    });
    setAssetsFeedback("");
    setAssetsError("");
  }

  function handleCancelFlowEdit() {
    setEditingFlowId(null);
    setFlowForm(defaultFlowForm);
    setAssetsFeedback("");
    setAssetsError("");
  }

  function handleEditTemplate(template: MessageTemplate) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      category: template.category,
      language: template.language,
      body: template.body,
      variables: template.variables,
      active: template.active,
    });
    setAssetsFeedback("");
    setAssetsError("");
  }

  function handleCancelTemplateEdit() {
    setEditingTemplateId(null);
    setTemplateForm(defaultTemplateForm);
    setAssetsFeedback("");
    setAssetsError("");
  }

  async function handleRegisterUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;

    setTeamLoading(true);
    setTeamError("");
    setTeamResult(null);

    try {
      const result = await registerUser({ ...teamForm, tenant_id: tenantId }, token);
      setTeamResult(result);
      setTeamForm(defaultTeamForm);
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Não foi possível criar o usuário.");
    } finally {
      setTeamLoading(false);
    }
  }

  async function handleWebhookSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWebhookLoading(true);
    setWebhookError("");
    setWebhookResult(null);

    try {
      const result = await sendWebhookMessage(webhookForm);
      setWebhookResult(result);
      await refreshAll();
      await refreshConversationsOnly();
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : "Não foi possível processar a mensagem.");
    } finally {
      setWebhookLoading(false);
    }
  }

  async function handleVerifyWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyLoading(true);
    setVerifyError("");
    setVerifyResult(null);

    try {
      setVerifyResult(await verifyWebhook(verifyForm));
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : "Não foi possível validar o webhook.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleSimulateLocalMeta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalMetaLoading(true);
    setLocalMetaError("");
    setLocalMetaResult(null);

    try {
      const result = await simulateLocalMetaWebhook(localMetaForm);
      setLocalMetaResult(result);
      await refreshAll();
      await refreshConversationsOnly();
    } catch (error) {
      setLocalMetaError(error instanceof Error ? error.message : "Não foi possível simular o evento Meta local.");
    } finally {
      setLocalMetaLoading(false);
    }
  }

  async function handleSaveChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;

    setChannelSaving(true);
    setChannelFeedback("");

    try {
      const result = await updateWhatsAppChannelConfig(tenantId, token, channelForm);
      setChannelConfig(result);
      setChannelForm((current) => ({ ...current, access_token: "" }));
      await refreshAll();
      setChannelFeedback("Canal WhatsApp salvo com sucesso.");
    } catch (error) {
      setChannelFeedback(error instanceof Error ? error.message : "Não foi possível salvar o canal.");
    } finally {
      setChannelSaving(false);
    }
  }

  async function handleConversationAction(action: "handoff" | "resume", conversationId: string) {
    if (!token || !tenantId) return;

    try {
      if (action === "handoff") {
        await handoffConversation(tenantId, conversationId, token);
      } else {
        await resumeConversation(tenantId, conversationId, token);
      }
      await refreshAll();
      await refreshConversationsOnly();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível atualizar a conversa.");
    }
  }

  async function handleSendManualReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId || !selectedConversationId) return;

    setReplying(true);
    setReplyError("");
    setReplyFeedback("");

    try {
      await sendManualConversationReply(tenantId, selectedConversationId, token, {
        content: replyDraft,
        message_type: "text",
      });
      setReplyDraft("");
      setReplyFeedback("Mensagem humana enviada com sucesso.");
      await refreshConversationsOnly();
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Não foi possível enviar a resposta humana.");
    } finally {
      setReplying(false);
    }
  }

  if (booting) {
    return (
      <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4">
        <div className="glass-panel w-full max-w-xl px-8 py-10 text-center">
          <span className="pill">Carregando</span>
          <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-[color:var(--color-ink)]">Montando o dashboard</h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
            Estamos organizando a visão completa da operação do bot.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {sidebarOpen ? <button aria-label="Fechar menu lateral" className="sidebar-overlay" onClick={() => setSidebarOpen(false)} type="button" /> : null}
      <section className="mx-auto grid w-full max-w-[1560px] gap-4 px-3 py-3 sm:px-4 sm:py-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start xl:px-14">
        <aside
          className={`sidebar-float ${sidebarOpen ? "translate-x-0" : "-translate-x-[100%]"} xl:ml-6 xl:sticky xl:top-5`}
        >
          <div className="glass-panel surface-noise h-full p-3">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#0a2214,#102b1a_55%,#112218)] px-4 py-4 text-white shadow-[0_28px_72px_rgba(4,10,7,0.42)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">Zap Automation</p>
                <h2 className="mt-1.5 text-[1.1rem] font-semibold tracking-[-0.04em]">{getSessionState().tenant?.name ?? "Empresa"}</h2>
              </div>
              <button
                className="secondary-button px-3 py-2 text-xs text-white hover:text-white xl:hidden"
                onClick={() => setSidebarOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </div>
            <p className="mt-2.5 text-[13px] leading-5 text-white/70">
              <strong>Aqui você controla todo o movimento de sua empresa em poucos cliques.</strong>
           </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/6 px-2.5 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Health</p>
                <p className="mt-1.5 text-xl font-semibold text-white">{health?.health_score ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/6 px-2.5 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Humano</p>
                <p className="mt-1.5 text-xl font-semibold text-white">{dashboard?.totals.human_handoffs_open ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">Tema</span>
            <ThemeToggle />
          </div>

          <div className="section-shell mt-4 px-3.5 py-3.5">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">Navegação</p>
            <div className="grid gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`sidebar-nav-item ${
                  activeSection === section.id
                    ? "sidebar-nav-item-active"
                    : ""
                }`}
                onClick={() => {
                  setActiveSection(section.id);
                  setSidebarOpen(false);
                }}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--color-line)] bg-[color:var(--theme-card-strong)] text-[10px] font-semibold tracking-[0.14em] text-[color:var(--color-muted)]">
                    {section.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[color:var(--color-ink)]">{section.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[color:var(--color-muted)]">{section.description}</span>
                  </div>
                </div>
              </button>
            ))}
            </div>
          </div>

          <div className="section-shell mt-4 px-3.5 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">Resumo</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="sidebar-info-card flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Plano atual</span>
                <div className="mt-1">
                  <p className="text-[13px] font-semibold leading-5 text-[color:var(--color-ink)]">{planSummary.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[color:var(--color-muted)]">{planSummary.detail}</p>
                </div>
              </div>
              <div className="sidebar-info-card flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Canal de envio</span>
                <div className="mt-1">
                  <p className="text-[13px] font-semibold leading-5 text-[color:var(--color-ink)]">{channelSummary.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[color:var(--color-muted)]">{channelSummary.detail}</p>
                </div>
              </div>
              <div className="sidebar-info-card col-span-2 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Responsável pelo painel</span>
                <div className="mt-1">
                  <p className="text-[13px] font-semibold leading-5 text-[color:var(--color-ink)]">{responsibleName}</p>
                  <p className="mt-1 truncate text-[11px] leading-4 text-[color:var(--color-muted)]">{responsibleDetail}</p>
                </div>
              </div>
            </div>
          </div>

          <button className="secondary-button mt-4 w-full" onClick={handleLogout} type="button">
            Sair do Painel
          </button>
          </div>
        </aside>

        <div className="grid min-w-0 gap-4">
          <div className="section-shell px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px] xl:items-stretch">
              <div className="dashboard-card px-5 py-5 sm:px-6 sm:py-6">
                <button
                  className="secondary-button mb-4 inline-flex xl:hidden"
                  onClick={() => setSidebarOpen(true)}
                  type="button"
                >
                  Abrir menu
                </button>
                <span className="pill">{currentSection.label}</span>
                <h1 className="mt-4 max-w-[16ch] text-[2.15rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)] sm:text-[2.6rem]">
                  Controle da operação em um único painel
                </h1>
                <p className="mt-3 max-w-3xl text-[13px] leading-6 text-[color:var(--color-muted)] sm:text-sm">
                  {currentSection.description}. Acompanhe atendimento, automação, equipe e canal de entrega com uma interface mais enxuta e preparada para operação real.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="pill">Visão operacional</span>
                  <span className="pill">Painel centralizado</span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="dashboard-card flex min-h-[108px] flex-col justify-between px-4 py-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Health</span>
                  <p className="mt-2 text-[1.7rem] font-semibold text-[color:var(--color-ink)]">{health?.health_score ?? 0}</p>
                </div>
                <div className="dashboard-card flex min-h-[108px] flex-col justify-between px-4 py-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Conversas Humanas</span>
                  <p className="mt-2 text-[1.7rem] font-semibold text-[color:var(--color-ink)]">{dashboard?.totals.human_handoffs_open ?? 0}</p>
                </div>
                <div className="dashboard-card flex min-h-[108px] flex-col justify-between px-4 py-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Canal</span>
                  <p className="mt-2 text-[1.45rem] font-semibold text-[color:var(--color-ink)]">{channelSummary.title}</p>
                </div>
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-3xl border border-[rgba(255,120,120,0.22)] bg-[rgba(120,28,28,0.16)] px-5 py-4 text-sm font-medium text-[rgb(255,196,196)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              {loadError}
            </div>
          ) : null}

          {activeSection === "overview" ? (
            <>
              <DashboardOverview
                dashboard={dashboard}
                health={health}
                selectedPlan={selectedPlan}
                activePlanName={getSessionState().tenant?.plan_name}
              />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_380px]">
                <div className="panel-shell">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="pill">Atividade Recente</span>
                      <h2 className="panel-title">Movimento do Atendimento</h2>
                    </div>
                    <span className="text-sm text-[color:var(--color-muted)]">{recentActivities.length} Registros</span>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {recentActivities.length ? (
                      recentActivities.map((activity) => (
                        <article key={activity.id} className="interactive-card px-5 py-4">
                          <p className="text-sm font-semibold text-[color:var(--color-ink)]">{activity.title}</p>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{activity.description}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">{activity.meta}</p>
                        </article>
                      ))
                    ) : (
                      <div className="soft-card px-5 py-8 text-sm text-[color:var(--color-muted)]">
                        Ainda não há atividade suficiente para montar a linha do tempo.
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel-shell">
                  <span className="pill">Indicadores de Fase 1</span>
                  <h2 className="panel-title">Maturidade da Operação</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Bot ativo", botSettings.bot_enabled ? "Sim" : "Não"],
                      ["Regras configuradas", String(rules.length)],
                      ["Conversas monitoradas", String(conversations.length)],
                      ["Webhook", webhookResult ? "Validado" : "Pronto"],
                    ].map(([label, value]) => (
                      <article key={label} className="soft-card">
                        <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">{label}</span>
                        <p className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">{value}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className={`grid gap-4 ${activeSection === "automation" ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "hidden"}`}>
            <div className="grid gap-4">
              <BotSettingsPanel
                botSettings={botSettings}
                saving={settingsSaving}
                feedback={settingsFeedback}
                onChange={setBotSettings}
                onSubmit={handleSettingsSubmit}
              />
              <FlowEditorPanel
                flows={flows}
                flowForm={flowForm}
                editingFlowId={editingFlowId}
                saving={assetsSaving}
                feedback={assetsFeedback}
                error={assetsError}
                onFlowFormChange={setFlowForm}
                onCreateFlow={handleCreateFlow}
                onUpdateFlow={handleUpdateFlow}
                onEditFlow={handleEditFlow}
                onCancelFlowEdit={handleCancelFlowEdit}
              />
              <TemplateEditorPanel
                templates={templates}
                templateForm={templateForm}
                editingTemplateId={editingTemplateId}
                saving={assetsSaving}
                feedback={assetsFeedback}
                error={assetsError}
                onTemplateFormChange={setTemplateForm}
                onCreateTemplate={handleCreateTemplate}
                onUpdateTemplate={handleUpdateTemplate}
                onEditTemplate={handleEditTemplate}
                onCancelTemplateEdit={handleCancelTemplateEdit}
              />
            </div>
            <div className="grid gap-4">
              <RulesManagerPanel
                rules={rules}
                form={ruleForm}
                saving={ruleSaving}
                feedback={ruleFeedback}
                error={ruleError}
                editingRuleId={editingRuleId}
                onFormChange={setRuleForm}
                onCreate={handleCreateRule}
                onUpdate={handleUpdateRule}
                onToggle={(rule) => void handleToggleRule(rule)}
                onEdit={handleEditRule}
                onCancelEdit={handleCancelRuleEdit}
              />
              <FlowLibraryPanel
                flows={flows}
                onEditFlow={handleEditFlow}
              />
              <TemplateLibraryPanel
                templates={templates}
                onEditTemplate={handleEditTemplate}
              />
            </div>
          </div>

          <div className={activeSection === "conversations" ? "grid gap-4" : "hidden"}>
            <ConversationsPanel
              conversations={conversations}
              filteredConversations={filteredConversations}
              selectedConversationId={selectedConversationId}
              selectedConversation={selectedConversation}
              messages={messages}
              filters={conversationFilters}
              replyDraft={replyDraft}
              replying={replying}
              replyFeedback={replyFeedback}
              replyError={replyError}
              autoRefreshEnabled={autoRefreshEnabled}
              refreshIntervalSeconds={refreshIntervalSeconds}
              onSelectConversation={setSelectedConversationId}
              onHandoff={(conversationId) => void handleConversationAction("handoff", conversationId)}
              onResume={(conversationId) => void handleConversationAction("resume", conversationId)}
              onReplyDraftChange={setReplyDraft}
              onSendReply={handleSendManualReply}
              onFilterChange={setConversationFilters}
              onAutoRefreshChange={setAutoRefreshEnabled}
              onRefreshIntervalChange={setRefreshIntervalSeconds}
              onRefreshNow={() => void refreshConversationsOnly()}
            />
          </div>

          <div className={activeSection === "operations" ? "grid gap-4" : "hidden"}>
            <OperationsPanel
              teamForm={teamForm}
              me={me}
              tenant={getSessionState().tenant}
              selectedPlan={selectedPlan}
              teamLoading={teamLoading}
              teamResult={teamResult}
              teamError={teamError}
              webhookForm={webhookForm}
              webhookLoading={webhookLoading}
              webhookResult={webhookResult}
              webhookError={webhookError}
              localMetaForm={localMetaForm}
              localMetaLoading={localMetaLoading}
              localMetaResult={localMetaResult}
              localMetaError={localMetaError}
              verifyForm={verifyForm}
              verifyLoading={verifyLoading}
              verifyResult={verifyResult}
              verifyError={verifyError}
              health={health}
              dashboard={dashboard}
              channelConfig={channelConfig}
              operationEvents={operationEvents}
              channelForm={channelForm}
              channelSaving={channelSaving}
              channelFeedback={channelFeedback}
              onTeamChange={setTeamForm}
              onWebhookChange={setWebhookForm}
              onVerifyChange={setVerifyForm}
              onLocalMetaChange={setLocalMetaForm}
              onChannelChange={setChannelForm}
              onRegisterUser={handleRegisterUser}
              onSendWebhook={handleWebhookSubmit}
              onSimulateLocalMeta={handleSimulateLocalMeta}
              onVerifyWebhook={handleVerifyWebhook}
              onSaveChannel={handleSaveChannel}
            />
          </div>

          <div className={activeSection === "overview" ? "grid gap-4" : "hidden"}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_380px]">
              <div className="panel-shell">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="pill">Fila operacional</span>
                    <h2 className="panel-title">Atalhos da operação</h2>
                  </div>
                  <span className="text-sm text-[color:var(--color-muted)]">Resumo do Dia</span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button
                    className="interactive-card text-left"
                    onClick={() => setActiveSection("conversations")}
                    type="button"
                  >
                    <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                      Conversas
                    </span>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">
                      {conversations.length} Monitoradas
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                      Abra o inbox, assuma operacional e acompanhe a fila em tempo real.
                    </p>
                  </button>
                  <button
                    className="interactive-card text-left"
                    onClick={() => setActiveSection("automation")}
                    type="button"
                  >
                    <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                      Automação
                    </span>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">
                      {rules.length} regras ativas
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                      Ajuste fluxos, horários, fallback e respostas do bot sem sair do painel.
                    </p>
                  </button>
                  <button
                    className="interactive-card text-left"
                    onClick={() => setActiveSection("operations")}
                    type="button"
                  >
                    <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                      Operações
                    </span>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">
                      Canal {channelConfig?.provider ?? "simulation"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                      Gerencie equipe, webhook, canal de WhatsApp e saúde do tenant.
                    </p>
                  </button>
                </div>
              </div>

              <div className="panel-shell">
                <span className="pill">Checklist rápido</span>
                <h2 className="panel-title">O que olhar agora</h2>
                <div className="mt-5 grid gap-3">
                  {[
                    botSettings.bot_enabled
                      ? "Bot ativo e pronto para responder novas mensagens."
                      : "Bot desativado no momento. Reative para voltar a responder.",
                    channelConfig?.provider === "simulation"
                      ? "Canal ainda em simulação local. Configure Twilio ou Meta para envio real."
                      : `Canal ${channelConfig?.provider} configurado para entrega.`,
                    selectedPlan?.name
                      ? `Plano atual: ${selectedPlan.name}.`
                      : "Plano atual ainda não identificado pelo tenant.",
                    webhookResult
                      ? "Webhook validado recentemente."
                      : "Webhook pronto para validação quando necessário.",
                  ].map((item) => (
                    <div key={item} className="soft-card text-sm leading-6 text-[color:var(--color-muted)]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter compact />
    </div>
  );
}
