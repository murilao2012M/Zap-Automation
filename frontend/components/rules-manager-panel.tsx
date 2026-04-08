import type { AutomationRule, AutomationRulePayload } from "@/lib/api";

type Props = {
  rules: AutomationRule[];
  form: AutomationRulePayload;
  saving: boolean;
  feedback: string;
  error: string;
  editingRuleId: string | null;
  onFormChange: (form: AutomationRulePayload) => void;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: (event: React.FormEvent<HTMLFormElement>) => void;
  onToggle: (rule: AutomationRule) => void;
  onEdit: (rule: AutomationRule) => void;
  onCancelEdit: () => void;
};

function formatRuleFormValue(rule: AutomationRule): AutomationRulePayload {
  return {
    name: rule.name,
    keywords: rule.keywords ?? [],
    intent: rule.intent ?? null,
    response_template: rule.response_template,
    requires_human: rule.requires_human,
    active: rule.active,
    priority: rule.priority,
    trigger_type: rule.trigger_type,
    trigger_value: rule.trigger_value ?? "",
  };
}

function formatRuleDisplayName(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function RulesManagerPanel({
  rules,
  form,
  saving,
  feedback,
  error,
  editingRuleId,
  onFormChange,
  onCreate,
  onUpdate,
  onToggle,
  onEdit,
  onCancelEdit,
}: Props) {
  const isEditing = Boolean(editingRuleId);

  return (
    <div className="panel-shell sm:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Regras de automação</span>
          <h2 className="panel-title">CRUD de regras</h2>
        </div>
        <span className="text-sm text-[color:var(--color-muted)]">{rules.length} regras carregadas</span>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={isEditing ? onUpdate : onCreate}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            {isEditing ? "Revise a regra selecionada e publique uma versão mais clara do fluxo." : "Monte regras de roteamento, menu e handoff com uma operação mais organizada para cada empresa."}
          </p>
          {isEditing ? (
            <button className="secondary-button px-4 py-2" onClick={onCancelEdit} type="button">
              Cancelar edição
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">Nome da regra</span>
            <input className="field-input" value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} placeholder="financeiro_urgente" required />
          </label>
          <label>
            <span className="field-label">Prioridade</span>
            <input className="field-input" min={1} max={1000} type="number" value={form.priority} onChange={(event) => onFormChange({ ...form, priority: Number(event.target.value) })} required />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="field-label">Trigger</span>
            <select className="field-input" value={form.trigger_type} onChange={(event) => onFormChange({ ...form, trigger_type: event.target.value as AutomationRulePayload["trigger_type"] })}>
              <option value="keyword">keyword</option>
              <option value="intent">intent</option>
              <option value="menu">menu</option>
            </select>
          </label>
          <label>
            <span className="field-label">Intent</span>
            <input className="field-input" value={form.intent ?? ""} onChange={(event) => onFormChange({ ...form, intent: event.target.value || null })} placeholder="financeiro" />
          </label>
          <label>
            <span className="field-label">Trigger value</span>
            <input className="field-input" value={form.trigger_value ?? ""} onChange={(event) => onFormChange({ ...form, trigger_value: event.target.value })} placeholder="pix" />
          </label>
        </div>

        <label>
          <span className="field-label">Keywords</span>
          <input
            className="field-input"
            value={form.keywords.join(", ")}
            onChange={(event) =>
              onFormChange({
                ...form,
                keywords: event.target.value
                  .split(",")
                  .map((keyword) => keyword.trim())
                  .filter(Boolean),
              })
            }
            placeholder="pix, pagamento urgente"
          />
        </label>

        <label>
          <span className="field-label">Resposta</span>
          <textarea className="field-input min-h-24 resize-y" value={form.response_template} onChange={(event) => onFormChange({ ...form, response_template: event.target.value })} required />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="toggle-card flex items-center gap-3">
            <input checked={form.requires_human} onChange={(event) => onFormChange({ ...form, requires_human: event.target.checked })} type="checkbox" />
            <span className="text-sm text-[color:var(--color-ink)]">Exigir handoff humano</span>
          </label>
          <label className="toggle-card flex items-center gap-3">
            <input checked={form.active} onChange={(event) => onFormChange({ ...form, active: event.target.checked })} type="checkbox" />
            <span className="text-sm text-[color:var(--color-ink)]">Regra ativa</span>
          </label>
        </div>

        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {feedback ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{feedback}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button className="primary-button w-full sm:w-fit" disabled={saving} type="submit">
            {saving ? "Salvando regra..." : isEditing ? "Salvar alterações" : "Salvar nova regra"}
          </button>
          {isEditing ? (
            <button className="secondary-button w-full sm:w-fit" onClick={onCancelEdit} type="button">
              Limpar formulário
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 grid gap-3">
        {rules.map((rule) => {
          const isActiveEdit = editingRuleId === rule.id;

          return (
            <article
              key={rule.id}
              className={`interactive-card px-5 py-4 ${
                isActiveEdit
                  ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)]"
                  : ""
              }`}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                    {rule.trigger_type} | prioridade {rule.priority}
                  </p>
                  <h3 className="mt-2 break-words font-serif text-[1.55rem] tracking-[-0.04em] text-[color:var(--color-ink)]">
                    {formatRuleDisplayName(rule.name)}
                  </h3>
                  <p className="mt-2 break-words text-sm leading-6 text-[color:var(--color-muted)]">
                    {rule.response_template}
                  </p>
                </div>
                <div className="flex min-w-[104px] flex-col gap-2 lg:items-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${rule.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
                    {rule.active ? "ativa" : "inativa"}
                  </span>
                  <div className="grid gap-2 lg:w-[104px]">
                    <button className="secondary-button w-full px-4 py-2" onClick={() => onEdit(rule)} type="button">
                      {isActiveEdit ? "Em edição" : "Ajustar"}
                    </button>
                    <button className="secondary-button w-full px-4 py-2" onClick={() => onToggle(rule)} type="button">
                      {rule.active ? "Pausar" : "Reativar"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export { formatRuleFormValue };
