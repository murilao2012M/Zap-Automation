import type {
  DashboardResponse,
  HealthResponse,
  LocalMetaWebhookSimulationPayload,
  Plan,
  RegisterUserPayload,
  TenantSummary,
  UserSummary,
  VerifyWebhookPayload,
  WebhookPayload,
  WebhookResult,
  WhatsAppChannelConfig,
  WhatsAppChannelConfigPayload,
  OperationEvent,
} from "@/lib/api";

type Props = {
  teamForm: Omit<RegisterUserPayload, "tenant_id">;
  me: UserSummary | null;
  tenant: TenantSummary | null;
  selectedPlan: Plan | null;
  teamLoading: boolean;
  teamResult: UserSummary | null;
  teamError: string;
  webhookForm: WebhookPayload;
  webhookLoading: boolean;
  webhookResult: WebhookResult | null;
  webhookError: string;
  localMetaForm: LocalMetaWebhookSimulationPayload;
  localMetaLoading: boolean;
  localMetaResult: { processed_messages: number; processed_status_updates: number; results: WebhookResult[] } | null;
  localMetaError: string;
  verifyForm: VerifyWebhookPayload;
  verifyLoading: boolean;
  verifyResult: number | null;
  verifyError: string;
  health: HealthResponse | null;
  dashboard: DashboardResponse | null;
  channelConfig: WhatsAppChannelConfig | null;
  operationEvents: OperationEvent[];
  channelForm: WhatsAppChannelConfigPayload;
  channelSaving: boolean;
  channelFeedback: string;
  onTeamChange: (form: Omit<RegisterUserPayload, "tenant_id">) => void;
  onWebhookChange: (form: WebhookPayload) => void;
  onVerifyChange: (form: VerifyWebhookPayload) => void;
  onLocalMetaChange: (form: LocalMetaWebhookSimulationPayload) => void;
  onChannelChange: (form: WhatsAppChannelConfigPayload) => void;
  onRegisterUser: (event: React.FormEvent<HTMLFormElement>) => void;
  onSendWebhook: (event: React.FormEvent<HTMLFormElement>) => void;
  onSimulateLocalMeta: (event: React.FormEvent<HTMLFormElement>) => void;
  onVerifyWebhook: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveChannel: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function OperationsPanel({
  teamForm,
  me,
  tenant,
  selectedPlan,
  teamLoading,
  teamResult,
  teamError,
  webhookForm,
  webhookLoading,
  webhookResult,
  webhookError,
  localMetaForm,
  localMetaLoading,
  localMetaResult,
  localMetaError,
  verifyForm,
  verifyLoading,
  verifyResult,
  verifyError,
  health,
  dashboard,
  channelConfig,
  operationEvents,
  channelForm,
  channelSaving,
  channelFeedback,
  onTeamChange,
  onWebhookChange,
  onVerifyChange,
  onLocalMetaChange,
  onChannelChange,
  onRegisterUser,
  onSendWebhook,
  onSimulateLocalMeta,
  onVerifyWebhook,
  onSaveChannel,
}: Props) {
  const onboardingSteps = dashboard?.onboarding ?? [];
  const completedOnboarding = onboardingSteps.filter((step) => step.completed).length;
  const providerGuide =
    channelForm.provider === "meta"
      ? [
          "Crie ou selecione um número no WhatsApp Business Platform.",
          "Preencha Phone Number ID, Business Account ID e Access Token.",
          "Valide o webhook e faça um teste para confirmar a entrega.",
        ]
      : channelForm.provider === "twilio"
        ? [
            "Ative um remetente WhatsApp na Twilio.",
            "Cole Account SID, Auth Token e o número conectado.",
            "Aponte o webhook da Twilio e envie uma mensagem de validação.",
          ]
        : [
            "Use o modo de simulação para validar a operação.",
            "Teste regras, fluxos e handoff sem enviar mensagens reais.",
            "Quando estiver pronto, troque para Meta ou Twilio.",
          ];

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel-shell">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="pill">Conta da empresa</span>
              <h2 className="panel-title">Conta, plano e acesso</h2>
            </div>
            <span className="text-sm text-[color:var(--color-muted)]">{tenant?.status ?? "trial"}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <article className="soft-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Empresa</span>
              <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">{tenant?.name ?? "Empresa não identificada"}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">Ambiente principal usado pela operação comercial.</p>
            </article>
            <article className="soft-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Plano</span>
              <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">{selectedPlan?.name ?? tenant?.plan_name ?? "starter"}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{selectedPlan?.description ?? "Plano atual da conta com limites e recursos definidos."}</p>
            </article>
            <article className="soft-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Responsável</span>
              <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">{me?.name ?? "Usuário principal"}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{me?.email ?? "Sem e-mail identificado"}</p>
            </article>
            <article className="soft-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Papel de acesso</span>
              <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">{me?.role ?? "admin"}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">Permissões ativas para configurar, operar e acompanhar a conta.</p>
            </article>
          </div>
          {selectedPlan?.checkout_url ? (
            <a className="primary-button mt-5 inline-flex w-full items-center justify-center" href={selectedPlan.checkout_url} rel="noreferrer" target="_blank">
              Gerenciar plano e upgrade
            </a>
          ) : null}
        </div>

        <div className="panel-shell">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="pill">Onboarding guiado</span>
              <h2 className="panel-title">Primeiros passos da operação</h2>
            </div>
            <span className="text-sm text-[color:var(--color-muted)]">
              {completedOnboarding}/{onboardingSteps.length || 0} etapas
            </span>
          </div>
          <div className="mt-5 h-2 rounded-full bg-[color:var(--color-line)]/80">
            <div
              className="h-2 rounded-full bg-[color:var(--color-brand)]"
              style={{
                width: `${onboardingSteps.length ? (completedOnboarding / onboardingSteps.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-5 grid gap-3">
            {onboardingSteps.length ? (
              onboardingSteps.map((step, index) => (
                <article key={step.key} className="soft-card">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step.completed ? "bg-emerald-100 text-emerald-700" : "bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]"}`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--color-ink)]">{step.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
                        {step.completed ? "Etapa concluída e pronta para a próxima fase da operação." : "Etapa pendente para liberar uma operação mais completa e vendável."}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="soft-card text-sm leading-6 text-[color:var(--color-muted)]">
                O onboarding básico ainda não foi carregado para esta conta.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel-shell">
          <span className="pill">Canal WhatsApp</span>
          <h2 className="panel-title">Conexão guiada com o canal</h2>
          <form className="mt-5 grid gap-4" onSubmit={onSaveChannel}>
            <select className="field-input" value={channelForm.provider ?? "simulation"} onChange={(event) => onChannelChange({ ...channelForm, provider: event.target.value as WhatsAppChannelConfigPayload["provider"] })}>
              <option value="simulation">Simulação local</option>
              <option value="twilio">Twilio WhatsApp</option>
              <option value="meta">Meta Cloud API</option>
            </select>

            {channelForm.provider === "twilio" ? (
              <>
                <input className="field-input" value={channelForm.twilio_account_sid ?? ""} onChange={(event) => onChannelChange({ ...channelForm, twilio_account_sid: event.target.value })} placeholder="Twilio Account SID" />
                <input className="field-input" type="password" value={channelForm.twilio_auth_token ?? ""} onChange={(event) => onChannelChange({ ...channelForm, twilio_auth_token: event.target.value })} placeholder="Twilio Auth Token" />
                <input className="field-input" value={channelForm.twilio_whatsapp_number ?? ""} onChange={(event) => onChannelChange({ ...channelForm, twilio_whatsapp_number: event.target.value })} placeholder="Número WhatsApp da Twilio" />
                <div className="soft-card text-sm text-[color:var(--color-muted)]">
                  Webhook Twilio: <strong className="text-[color:var(--color-ink)]">POST /api/v1/webhook/whatsapp/twilio</strong>
                </div>
              </>
            ) : null}

            {channelForm.provider === "meta" ? (
              <>
                <input className="field-input" value={channelForm.phone_number_id ?? ""} onChange={(event) => onChannelChange({ ...channelForm, phone_number_id: event.target.value })} placeholder="Phone Number ID" />
                <input className="field-input" value={channelForm.business_account_id ?? ""} onChange={(event) => onChannelChange({ ...channelForm, business_account_id: event.target.value })} placeholder="Business Account ID" />
                <input className="field-input" value={channelForm.api_version ?? ""} onChange={(event) => onChannelChange({ ...channelForm, api_version: event.target.value })} placeholder="v21.0" />
                <input className="field-input" type="password" value={channelForm.access_token ?? ""} onChange={(event) => onChannelChange({ ...channelForm, access_token: event.target.value })} placeholder="Access token da Meta" />
              </>
            ) : null}

            <div className="section-shell px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                Guia rápido
              </p>
              <div className="mt-3 grid gap-2">
                {providerGuide.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 text-sm leading-6 text-[color:var(--color-muted)]">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] text-[11px] font-semibold text-[color:var(--color-brand)]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="soft-card text-sm text-[color:var(--color-muted)]">
              Status: <strong className="text-[color:var(--color-ink)]">{channelConfig?.connected ? "Conectado" : "Não conectado"}</strong>
              <span> | provedor: {channelConfig?.provider ?? "simulation"}</span>
              {channelConfig?.access_token_hint ? <span> | token: {channelConfig.access_token_hint}</span> : null}
              {channelConfig?.twilio_account_sid_hint ? <span> | sid: {channelConfig.twilio_account_sid_hint}</span> : null}
            </div>
            {channelFeedback ? <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${channelFeedback.includes("sucesso") ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>{channelFeedback}</p> : null}
            <button className="primary-button w-full" disabled={channelSaving} type="submit">{channelSaving ? "Salvando..." : "Salvar integração do canal"}</button>
          </form>
        </div>

        <div className="panel-shell">
          <span className="pill">Equipe</span>
          <h2 className="panel-title">Criar membro</h2>
          <form className="mt-5 grid gap-4" onSubmit={onRegisterUser}>
            <input className="field-input" value={teamForm.name} onChange={(event) => onTeamChange({ ...teamForm, name: event.target.value })} placeholder="Maria Operações" required />
            <input className="field-input" type="email" value={teamForm.email} onChange={(event) => onTeamChange({ ...teamForm, email: event.target.value })} placeholder="maria@empresa.com" required />
            <input className="field-input" type="password" minLength={8} value={teamForm.password} onChange={(event) => onTeamChange({ ...teamForm, password: event.target.value })} placeholder="Senha forte com 8+ caracteres" required />
            <select className="field-input" value={teamForm.role} onChange={(event) => onTeamChange({ ...teamForm, role: event.target.value })}>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
              <option value="viewer">Viewer</option>
            </select>
            {teamError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{teamError}</p> : null}
            {teamResult ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Usuário criado: {teamResult.name}</p> : null}
            <button className="primary-button w-full" disabled={teamLoading} type="submit">{teamLoading ? "Criando..." : "Adicionar membro"}</button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel-shell">
          <span className="pill">Webhook de teste</span>
          <h2 className="panel-title">Simular mensagem</h2>
          <form className="mt-5 grid gap-4" onSubmit={onSendWebhook}>
            <input className="field-input" value={webhookForm.phone} onChange={(event) => onWebhookChange({ ...webhookForm, phone: event.target.value })} placeholder="Telefone" required />
            <input className="field-input" value={webhookForm.contact_name ?? ""} onChange={(event) => onWebhookChange({ ...webhookForm, contact_name: event.target.value })} placeholder="Nome do contato" />
            <textarea className="field-input min-h-24 resize-y" value={webhookForm.message} onChange={(event) => onWebhookChange({ ...webhookForm, message: event.target.value })} placeholder="Mensagem" required />
            {webhookError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{webhookError}</p> : null}
            {webhookResult ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Resposta: {webhookResult.response}</p> : null}
            <button className="primary-button w-full" disabled={webhookLoading} type="submit">{webhookLoading ? "Processando..." : "Enviar mensagem"}</button>
          </form>
        </div>

        <div className="panel-shell">
          <span className="pill">Meta local</span>
          <h2 className="panel-title">Simular evento Meta</h2>
          <form className="mt-5 grid gap-4" onSubmit={onSimulateLocalMeta}>
            <input className="field-input" value={localMetaForm.phone} onChange={(event) => onLocalMetaChange({ ...localMetaForm, phone: event.target.value })} placeholder="Telefone WhatsApp" required />
            <input className="field-input" value={localMetaForm.contact_name ?? ""} onChange={(event) => onLocalMetaChange({ ...localMetaForm, contact_name: event.target.value })} placeholder="Nome do contato" />
            <input className="field-input" value={localMetaForm.phone_number_id ?? ""} onChange={(event) => onLocalMetaChange({ ...localMetaForm, phone_number_id: event.target.value })} placeholder="Phone Number ID local" />
            <textarea className="field-input min-h-24 resize-y" value={localMetaForm.message} onChange={(event) => onLocalMetaChange({ ...localMetaForm, message: event.target.value })} placeholder="Mensagem como se viesse da Meta" required />
            {localMetaError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{localMetaError}</p> : null}
            {localMetaResult ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Evento processado: {localMetaResult.processed_messages} mensagem(ns).</p> : null}
            <button className="secondary-button w-full" disabled={localMetaLoading} type="submit">{localMetaLoading ? "Simulando..." : "Simular evento Meta local"}</button>
          </form>
        </div>

        <div className="panel-shell">
          <span className="pill">Plano e comercial</span>
          <h2 className="panel-title">Plano, limites e expansão</h2>
          <div className="mt-5 grid gap-3">
            {Object.entries(dashboard?.usage ?? {}).map(([key, item]) => (
              <article key={key} className="soft-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">{key}</span>
                  <strong className="text-sm text-[color:var(--color-ink)]">
                    {item.used}/{item.limit ?? "ilimitado"}
                  </strong>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[color:var(--color-line)]/80">
                  <div className="h-2 rounded-full bg-[color:var(--color-brand)]" style={{ width: `${Math.min(item.usage_percent, 100)}%` }} />
                </div>
              </article>
            ))}
          </div>
          <ul className="mt-5 grid gap-3">
            {(dashboard?.onboarding ?? []).map((step) => (
              <li key={step.key} className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-sand)] px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
                {step.completed ? "Concluído" : "Pendente"}: {step.label}
              </li>
            ))}
          </ul>
          {dashboard?.plan.checkout_url ? (
            <a className="primary-button mt-5 inline-flex w-full items-center justify-center" href={dashboard.plan.checkout_url} rel="noreferrer" target="_blank">
              Comparar plano e solicitar upgrade
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel-shell">
          <span className="pill">Webhook GET</span>
          <h2 className="panel-title">Validar verificação</h2>
          <form className="mt-5 grid gap-4" onSubmit={onVerifyWebhook}>
            <input className="field-input" value={verifyForm.mode} onChange={(event) => onVerifyChange({ ...verifyForm, mode: event.target.value })} placeholder="Modo" required />
            <input className="field-input" value={verifyForm.challenge} onChange={(event) => onVerifyChange({ ...verifyForm, challenge: event.target.value })} placeholder="Challenge" required />
            <input className="field-input" value={verifyForm.verifyToken} onChange={(event) => onVerifyChange({ ...verifyForm, verifyToken: event.target.value })} placeholder="Verify token" required />
            {verifyError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{verifyError}</p> : null}
            {verifyResult !== null ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Challenge retornado: {verifyResult}</p> : null}
            <button className="secondary-button w-full" disabled={verifyLoading} type="submit">{verifyLoading ? "Validando..." : "Validar webhook"}</button>
          </form>
        </div>

        <div className="panel-shell">
          <span className="pill">Termômetro operacional</span>
          <h2 className="panel-title">Fatores do health score</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries(health?.factors ?? {}).map(([label, value]) => (
              <article key={label} className="soft-card">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">{label}</span>
                <strong className="mt-2 block font-serif text-3xl tracking-[-0.04em] text-[color:var(--color-ink)]">{value}</strong>
              </article>
            ))}
          </div>
          <ul className="mt-5 grid gap-3">
            {(health?.alerts ?? []).map((alert) => (
              <li key={alert} className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-sand)] px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
                {alert}
              </li>
            ))}
            {(dashboard?.commercial_alerts ?? []).map((alert) => (
              <li key={alert} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
                {alert}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel-shell">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill">Monitoramento de erro</span>
            <h2 className="panel-title">Eventos operacionais recentes</h2>
          </div>
          <span className="text-sm text-[color:var(--color-muted)]">{operationEvents.length} eventos</span>
        </div>
        <div className="mt-5 grid gap-3">
          {operationEvents.length ? (
            operationEvents.map((event) => (
              <article key={event.id} className="soft-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                      {event.category}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-[color:var(--color-ink)]">{event.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{event.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${event.level === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {event.level}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="soft-card text-sm leading-6 text-[color:var(--color-muted)]">
              Nenhum erro operacional recente. A fila, os webhooks e os providers estão sem incidentes visíveis no momento.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
