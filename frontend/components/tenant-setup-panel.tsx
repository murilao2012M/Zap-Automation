import type {
  TenantBillingProfile,
  TenantBillingProfilePayload,
  TenantSenderOnboarding,
  TenantSenderOnboardingPayload,
  WhatsAppChannelConfig,
  WhatsAppChannelConfigPayload,
} from "@/lib/api";

type Props = {
  billingProfile: TenantBillingProfile | null;
  billingForm: TenantBillingProfilePayload;
  billingSaving: boolean;
  billingFeedback: string;
  senderOnboarding: TenantSenderOnboarding | null;
  senderForm: TenantSenderOnboardingPayload;
  senderSaving: boolean;
  senderSubmitting: boolean;
  senderValidating: boolean;
  senderFeedback: string;
  channelConfig: WhatsAppChannelConfig | null;
  channelForm: WhatsAppChannelConfigPayload;
  onBillingChange: (form: TenantBillingProfilePayload) => void;
  onSenderChange: (form: TenantSenderOnboardingPayload) => void;
  onChannelChange: (form: WhatsAppChannelConfigPayload) => void;
  onSaveBilling: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveSender: (event: React.FormEvent<HTMLFormElement>) => void;
  onSubmitSender: () => void;
  onValidateSender: () => void;
};

function feedbackTone(message: string): string {
  return message.includes("sucesso")
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-red-200 bg-red-50 text-red-700";
}

function senderStatusTone(status: TenantSenderOnboarding["status"]): string {
  if (status === "connected") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "awaiting_provider" || status === "ready_for_validation") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-[color:var(--color-line)] bg-[color:var(--color-sand)] text-[color:var(--color-muted)]";
}

function storageLabel(channelConfig: WhatsAppChannelConfig | null): string {
  switch (channelConfig?.credential_storage_mode) {
    case "encrypted_at_rest":
      return "Credenciais protegidas no cofre do tenant";
    case "legacy_plaintext":
      return "Credenciais legadas. Salve novamente para migrar ao cofre criptografado";
    default:
      return "Nenhuma credencial sensivel registrada neste tenant";
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("pt-BR");
}

export function TenantSetupPanel({
  billingProfile,
  billingForm,
  billingSaving,
  billingFeedback,
  senderOnboarding,
  senderForm,
  senderSaving,
  senderSubmitting,
  senderValidating,
  senderFeedback,
  channelConfig,
  channelForm,
  onBillingChange,
  onSenderChange,
  onChannelChange,
  onSaveBilling,
  onSaveSender,
  onSubmitSender,
  onValidateSender,
}: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
      <div className="panel-shell">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill">Faturamento por tenant</span>
            <h2 className="panel-title">Comercial e checkout isolados</h2>
          </div>
          <span className="text-sm text-[color:var(--color-muted)]">{billingProfile?.billing_status ?? "draft"}</span>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={onSaveBilling}>
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              className="field-input"
              value={billingForm.selected_plan ?? billingProfile?.selected_plan ?? "starter"}
              onChange={(event) =>
                onBillingChange({
                  ...billingForm,
                  selected_plan: event.target.value as TenantBillingProfilePayload["selected_plan"],
                })
              }
            >
              <option value="starter">Starter</option>
              <option value="smarter">Smarter</option>
            </select>
            <select
              className="field-input"
              value={billingForm.contract_mode ?? billingProfile?.contract_mode ?? "assisted"}
              onChange={(event) =>
                onBillingChange({
                  ...billingForm,
                  contract_mode: event.target.value as TenantBillingProfilePayload["contract_mode"],
                })
              }
            >
              <option value="self_service">Self-service</option>
              <option value="assisted">Implantacao assistida</option>
              <option value="custom">Contrato customizado</option>
            </select>
            <input
              className="field-input"
              value={billingForm.billing_company_name ?? billingProfile?.billing_company_name ?? ""}
              onChange={(event) => onBillingChange({ ...billingForm, billing_company_name: event.target.value })}
              placeholder="Razao social ou nome comercial"
            />
            <select
              className="field-input"
              value={billingForm.billing_status ?? billingProfile?.billing_status ?? "draft"}
              onChange={(event) =>
                onBillingChange({
                  ...billingForm,
                  billing_status: event.target.value as TenantBillingProfilePayload["billing_status"],
                })
              }
            >
              <option value="draft">Draft</option>
              <option value="pending_checkout">Pendente de checkout</option>
              <option value="active">Ativo</option>
              <option value="past_due">Inadimplente</option>
              <option value="paused">Pausado</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="field-input"
              value={billingForm.billing_contact_name ?? billingProfile?.billing_contact_name ?? ""}
              onChange={(event) => onBillingChange({ ...billingForm, billing_contact_name: event.target.value })}
              placeholder="Responsavel financeiro"
            />
            <input
              className="field-input"
              type="email"
              value={billingForm.billing_contact_email ?? billingProfile?.billing_contact_email ?? ""}
              onChange={(event) => onBillingChange({ ...billingForm, billing_contact_email: event.target.value })}
              placeholder="financeiro@empresa.com"
            />
            <input
              className="field-input"
              value={billingForm.billing_contact_phone ?? billingProfile?.billing_contact_phone ?? ""}
              onChange={(event) => onBillingChange({ ...billingForm, billing_contact_phone: event.target.value })}
              placeholder="Telefone financeiro"
            />
            <input
              className="field-input"
              value={billingForm.billing_document ?? billingProfile?.billing_document ?? ""}
              onChange={(event) => onBillingChange({ ...billingForm, billing_document: event.target.value })}
              placeholder="CNPJ ou documento"
            />
          </div>

          <input
            className="field-input"
            value={billingForm.billing_address ?? billingProfile?.billing_address ?? ""}
            onChange={(event) => onBillingChange({ ...billingForm, billing_address: event.target.value })}
            placeholder="Endereco de faturamento"
          />

          <input
            className="field-input"
            value={billingForm.checkout_url_override ?? billingProfile?.checkout_url_override ?? ""}
            onChange={(event) => onBillingChange({ ...billingForm, checkout_url_override: event.target.value })}
            placeholder="Checkout especifico deste tenant (opcional)"
          />

          <textarea
            className="field-input min-h-24 resize-y"
            value={billingForm.legal_notes ?? billingProfile?.legal_notes ?? ""}
            onChange={(event) => onBillingChange({ ...billingForm, legal_notes: event.target.value })}
            placeholder="Observacoes comerciais, LGPD, contrato ou excecoes desta conta"
          />

          <div className="soft-card text-sm leading-6 text-[color:var(--color-muted)]">
            <p>
              <strong className="text-[color:var(--color-ink)]">Origem do checkout:</strong> {billingProfile?.checkout_source ?? "not_configured"}
            </p>
            <p className="mt-2">{billingProfile?.next_action ?? "Preencha o perfil comercial para isolar upgrade, renovacao e cobranca deste tenant."}</p>
            {billingProfile?.checkout_url ? (
              <a className="secondary-button mt-4 inline-flex items-center justify-center" href={billingProfile.checkout_url} rel="noreferrer" target="_blank">
                Abrir checkout deste tenant
              </a>
            ) : null}
          </div>

          {billingFeedback ? <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${feedbackTone(billingFeedback)}`}>{billingFeedback}</p> : null}
          <button className="primary-button w-full" disabled={billingSaving} type="submit">
            {billingSaving ? "Salvando..." : "Salvar faturamento do tenant"}
          </button>
        </form>
      </div>

      <div className="panel-shell">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill">Sender de producao</span>
            <h2 className="panel-title">Onboarding guiado do canal</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${senderStatusTone(senderOnboarding?.status ?? "draft")}`}>
            {senderOnboarding?.status ?? "draft"}
          </span>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={onSaveSender}>
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              className="field-input"
              value={senderForm.provider ?? senderOnboarding?.provider ?? channelForm.provider ?? "simulation"}
              onChange={(event) => {
                const provider = event.target.value as TenantSenderOnboardingPayload["provider"];
                onSenderChange({ ...senderForm, provider });
                onChannelChange({ ...channelForm, provider });
              }}
            >
              <option value="simulation">Simulacao</option>
              <option value="twilio">Twilio</option>
              <option value="meta">Meta</option>
            </select>
            <select
              className="field-input"
              value={senderForm.setup_mode ?? senderOnboarding?.setup_mode ?? "self_service"}
              onChange={(event) =>
                onSenderChange({
                  ...senderForm,
                  setup_mode: event.target.value as TenantSenderOnboardingPayload["setup_mode"],
                })
              }
            >
              <option value="self_service">Self-service guiado</option>
              <option value="assisted">Implantacao assistida</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="field-input"
              value={senderForm.business_display_name ?? senderOnboarding?.business_display_name ?? ""}
              onChange={(event) => onSenderChange({ ...senderForm, business_display_name: event.target.value })}
              placeholder="Nome exibido no WhatsApp"
            />
            <input
              className="field-input"
              value={senderForm.sender_phone_number ?? senderOnboarding?.sender_phone_number ?? ""}
              onChange={(event) => onSenderChange({ ...senderForm, sender_phone_number: event.target.value })}
              placeholder="Numero que sera conectado"
            />
            <input
              className="field-input"
              value={senderForm.sender_country ?? senderOnboarding?.sender_country ?? "BR"}
              onChange={(event) => onSenderChange({ ...senderForm, sender_country: event.target.value.toUpperCase() })}
              placeholder="BR"
            />
            <input
              className="field-input"
              value={senderForm.website_url ?? senderOnboarding?.website_url ?? ""}
              onChange={(event) => onSenderChange({ ...senderForm, website_url: event.target.value })}
              placeholder="https://empresa.com"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="field-input"
              value={senderForm.contact_name ?? senderOnboarding?.contact_name ?? ""}
              onChange={(event) => onSenderChange({ ...senderForm, contact_name: event.target.value })}
              placeholder="Contato responsavel"
            />
            <input
              className="field-input"
              type="email"
              value={senderForm.contact_email ?? senderOnboarding?.contact_email ?? ""}
              onChange={(event) => onSenderChange({ ...senderForm, contact_email: event.target.value })}
              placeholder="contato@empresa.com"
            />
            <input
              className="field-input"
              value={senderForm.contact_phone ?? senderOnboarding?.contact_phone ?? ""}
              onChange={(event) => onSenderChange({ ...senderForm, contact_phone: event.target.value })}
              placeholder="Telefone de implantacao"
            />
            <label className="section-shell flex items-center gap-3 px-4 py-4 text-sm text-[color:var(--color-muted)]">
              <input
                checked={senderForm.use_existing_number ?? senderOnboarding?.use_existing_number ?? true}
                onChange={(event) => onSenderChange({ ...senderForm, use_existing_number: event.target.checked })}
                type="checkbox"
              />
              Usar numero ja existente da empresa
            </label>
          </div>

          <textarea
            className="field-input min-h-24 resize-y"
            value={senderForm.notes ?? senderOnboarding?.notes ?? ""}
            onChange={(event) => onSenderChange({ ...senderForm, notes: event.target.value })}
            placeholder="Notas do onboarding, observacoes do sender e pendencias externas"
          />

          <div className={`rounded-[24px] border px-4 py-4 ${senderStatusTone(senderOnboarding?.status ?? "draft")}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Proximo passo</p>
            <p className="mt-2 text-sm leading-6">{senderOnboarding?.next_action ?? "Preencha o briefing e envie este tenant para a trilha de onboarding do sender."}</p>
            <div className="mt-4 grid gap-2 text-sm leading-6">
              {senderOnboarding?.provider_portal_label ? <p>Portal sugerido: <strong>{senderOnboarding.provider_portal_label}</strong></p> : null}
              {senderOnboarding?.webhook_url ? <p>Webhook esperado: <strong className="break-all">{senderOnboarding.webhook_url}</strong></p> : null}
              <p>{storageLabel(channelConfig)}</p>
              <p>Ultima validacao do canal: <strong>{formatDateTime(channelConfig?.last_validated_at)}</strong></p>
              <p>Credenciais atualizadas em: <strong>{formatDateTime(channelConfig?.credentials_updated_at)}</strong></p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button className="secondary-button w-full" disabled={senderSaving} type="submit">
              {senderSaving ? "Salvando..." : "Salvar briefing"}
            </button>
            <button className="secondary-button w-full" disabled={senderSubmitting} onClick={onSubmitSender} type="button">
              {senderSubmitting ? "Enviando..." : "Avancar onboarding"}
            </button>
            <button className="primary-button w-full" disabled={senderValidating} onClick={onValidateSender} type="button">
              {senderValidating ? "Validando..." : "Validar sender"}
            </button>
          </div>

          {senderFeedback ? <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${feedbackTone(senderFeedback)}`}>{senderFeedback}</p> : null}
        </form>
      </div>
    </div>
  );
}
