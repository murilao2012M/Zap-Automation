import type {
  AutomationFlow,
  AutomationFlowPayload,
  MessageTemplate,
  MessageTemplatePayload,
} from "@/lib/api";

const flowPresets: Array<{
  label: string;
  name: string;
  intent: string;
  description: string;
  entry_message: string;
  fallback_message: string;
}> = [
  {
    label: "Clínica",
    name: "Fluxo Consulta",
    intent: "agendamento",
    description: "Triagem para agendamento, confirmação e remarcação de consultas.",
    entry_message: "Perfeito. Vou ajudar você a organizar o atendimento e encontrar o melhor horário para a consulta.",
    fallback_message: "Se puder, envie o dia desejado, o período e o nome do procedimento para agilizar o atendimento.",
  },
  {
    label: "E-commerce",
    name: "Fluxo Pedido",
    intent: "compra",
    description: "Qualificação comercial para pedido, orçamento e acompanhamento da compra.",
    entry_message: "Ótimo. Posso ajudar com produtos, preços, orçamento e andamento do seu pedido com a nossa equipe.",
    fallback_message: "Se quiser, envie o nome do produto ou a referência do pedido para eu continuar.",
  },
  {
    label: "Serviços",
    name: "Fluxo Atendimento",
    intent: "suporte",
    description: "Recepção de suporte e priorização de chamados operacionais.",
    entry_message: "Vamos resolver isso juntos. Me conte o que aconteceu para eu direcionar seu atendimento com mais rapidez.",
    fallback_message: "Se puder, envie o contexto do problema, data do ocorrido e qualquer referência útil para a equipe.",
  },
];

const templatePresets: Array<{
  label: string;
  category: MessageTemplatePayload["category"];
  name: string;
  body: string;
  variables: string[];
}> = [
  {
    label: "Clínica",
    category: "service",
    name: "confirmacao_consulta",
    body: "Olá, {{first_name}}. Sua consulta com a sua empresa foi confirmada. Se precisar reagendar, responda esta mensagem.",
    variables: ["first_name"],
  },
  {
    label: "E-commerce",
    category: "utility",
    name: "status_pedido",
    body: "Olá, {{first_name}}. Seu pedido está em andamento e nossa equipe enviará a próxima atualização em breve.",
    variables: ["first_name"],
  },
  {
    label: "Serviços",
    category: "service",
    name: "agendamento_servico",
    body: "Olá, {{first_name}}. Recebemos sua solicitação e vamos confirmar o melhor horário para atendimento.",
    variables: ["first_name"],
  },
];

type SharedProps = {
  saving: boolean;
  feedback: string;
  error: string;
};

type FlowProps = SharedProps & {
  flows: AutomationFlow[];
  flowForm: AutomationFlowPayload;
  editingFlowId: string | null;
  onFlowFormChange: (form: AutomationFlowPayload) => void;
  onCreateFlow: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateFlow: (event: React.FormEvent<HTMLFormElement>) => void;
  onEditFlow: (flow: AutomationFlow) => void;
  onCancelFlowEdit: () => void;
};

type TemplateProps = SharedProps & {
  templates: MessageTemplate[];
  templateForm: MessageTemplatePayload;
  editingTemplateId: string | null;
  onTemplateFormChange: (form: MessageTemplatePayload) => void;
  onCreateTemplate: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateTemplate: (event: React.FormEvent<HTMLFormElement>) => void;
  onEditTemplate: (template: MessageTemplate) => void;
  onCancelTemplateEdit: () => void;
};

function formatFlowPreview(text: string): string {
  return text
    .replaceAll("{{company_name}}", "sua empresa")
    .replaceAll("{{ company_name }}", "sua empresa")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function FlowEditorPanel({
  flowForm,
  editingFlowId,
  saving,
  onFlowFormChange,
  onCreateFlow,
  onUpdateFlow,
  onCancelFlowEdit,
}: FlowProps) {
  return (
    <div className="panel-shell">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Fluxos por intenção</span>
          <h2 className="panel-title">Motor de automação</h2>
        </div>
        <span className="text-sm text-[color:var(--color-muted)]">
          {editingFlowId ? "Editando fluxo" : "Novo fluxo"}
        </span>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={editingFlowId ? onUpdateFlow : onCreateFlow}>
        <div className="grid gap-2 sm:grid-cols-3">
          {flowPresets.map((preset) => (
            <button
              key={preset.label}
              className="secondary-button px-3 py-2 text-xs"
              onClick={() =>
                onFlowFormChange({
                  ...flowForm,
                  name: preset.name,
                  intent: preset.intent,
                  description: preset.description,
                  entry_message: preset.entry_message,
                  fallback_message: preset.fallback_message,
                })
              }
              type="button"
            >
              Fluxo {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="field-input"
            value={flowForm.name}
            onChange={(event) => onFlowFormChange({ ...flowForm, name: event.target.value })}
            placeholder="Fluxo Compras"
            required
          />
          <input
            className="field-input"
            value={flowForm.intent}
            onChange={(event) => onFlowFormChange({ ...flowForm, intent: event.target.value })}
            placeholder="compra"
            required
          />
        </div>
        <input
          className="field-input"
          value={flowForm.description ?? ""}
          onChange={(event) => onFlowFormChange({ ...flowForm, description: event.target.value })}
          placeholder="Descrição operacional do fluxo"
        />
        <textarea
          className="field-input min-h-24 resize-y"
          value={flowForm.entry_message}
          onChange={(event) => onFlowFormChange({ ...flowForm, entry_message: event.target.value })}
          placeholder="Mensagem de entrada"
          required
        />
        <textarea
          className="field-input min-h-20 resize-y"
          value={flowForm.fallback_message ?? ""}
          onChange={(event) => onFlowFormChange({ ...flowForm, fallback_message: event.target.value })}
          placeholder="Mensagem de apoio / fallback do fluxo"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="toggle-card flex items-center gap-3">
            <input
              checked={flowForm.requires_human}
              onChange={(event) => onFlowFormChange({ ...flowForm, requires_human: event.target.checked })}
              type="checkbox"
            />
            <span className="text-sm text-[color:var(--color-ink)]">Encaminhar para humano</span>
          </label>
          <label className="toggle-card flex items-center gap-3">
            <input
              checked={flowForm.active}
              onChange={(event) => onFlowFormChange({ ...flowForm, active: event.target.checked })}
              type="checkbox"
            />
            <span className="text-sm text-[color:var(--color-ink)]">Fluxo ativo</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="primary-button w-full sm:w-fit" disabled={saving} type="submit">
            {saving ? "Salvando fluxo..." : editingFlowId ? "Atualizar fluxo" : "Salvar novo fluxo"}
          </button>
          {editingFlowId ? (
            <button className="secondary-button w-full sm:w-fit" onClick={onCancelFlowEdit} type="button">
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export function FlowLibraryPanel({ flows, onEditFlow }: Pick<FlowProps, "flows" | "onEditFlow">) {
  return (
    <div className="panel-shell">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Biblioteca de fluxos</span>
          <h2 className="panel-title">Fluxos ativos</h2>
        </div>
        <span className="text-sm text-[color:var(--color-muted)]">{flows.length} fluxos ativos</span>
      </div>

      <div className="mt-5 grid gap-3">
        {flows.map((flow) => (
          <article key={flow.id} className="interactive-card px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                  {flow.intent}
                </p>
                <h3 className="mt-2 font-serif text-2xl tracking-[-0.04em] text-[color:var(--color-ink)]">
                  {flow.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                  {formatFlowPreview(flow.entry_message)}
                </p>
              </div>
              <button className="secondary-button px-4 py-2" onClick={() => onEditFlow(flow)} type="button">
                Ajustar fluxo
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function TemplateEditorPanel({
  templateForm,
  editingTemplateId,
  saving,
  feedback,
  error,
  onTemplateFormChange,
  onCreateTemplate,
  onUpdateTemplate,
  onCancelTemplateEdit,
  onEditTemplate,
}: TemplateProps) {
  return (
    <div className="panel-shell">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Templates por tenant</span>
          <h2 className="panel-title">Criar template</h2>
        </div>
        <span className="text-sm text-[color:var(--color-muted)]">
          {editingTemplateId ? "Editando template" : "Novo template"}
        </span>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={editingTemplateId ? onUpdateTemplate : onCreateTemplate}>
        <div className="grid gap-2 sm:grid-cols-3">
          {templatePresets.map((preset) => (
            <button
              key={preset.label}
              className="secondary-button px-3 py-2 text-xs"
              onClick={() =>
                onTemplateFormChange({
                  ...templateForm,
                  name: preset.name,
                  category: preset.category,
                  body: preset.body,
                  variables: preset.variables,
                })
              }
              type="button"
            >
              Preset {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="field-input"
            value={templateForm.name}
            onChange={(event) => onTemplateFormChange({ ...templateForm, name: event.target.value })}
            placeholder="boas_vindas"
            required
          />
          <select
            className="field-input"
            value={templateForm.category}
            onChange={(event) =>
              onTemplateFormChange({
                ...templateForm,
                category: event.target.value as MessageTemplatePayload["category"],
              })
            }
          >
            <option value="service">service</option>
            <option value="utility">utility</option>
            <option value="marketing">marketing</option>
            <option value="authentication">authentication</option>
          </select>
          <input
            className="field-input"
            value={templateForm.language}
            onChange={(event) => onTemplateFormChange({ ...templateForm, language: event.target.value })}
            placeholder="pt_BR"
            required
          />
        </div>
        <input
          className="field-input"
          value={templateForm.variables.join(", ")}
          onChange={(event) =>
            onTemplateFormChange({
              ...templateForm,
              variables: event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          placeholder="company_name, first_name"
        />
        <textarea
          className="field-input min-h-24 resize-y"
          value={templateForm.body}
          onChange={(event) => onTemplateFormChange({ ...templateForm, body: event.target.value })}
          placeholder="Corpo do template"
          required
        />
        <label className="toggle-card flex items-center gap-3">
          <input
            checked={templateForm.active}
            onChange={(event) => onTemplateFormChange({ ...templateForm, active: event.target.checked })}
            type="checkbox"
          />
          <span className="text-sm text-[color:var(--color-ink)]">Template ativo</span>
        </label>
        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {feedback ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {feedback}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button className="primary-button w-full sm:w-fit" disabled={saving} type="submit">
            {saving ? "Salvando template..." : editingTemplateId ? "Atualizar template" : "Salvar novo template"}
          </button>
          {editingTemplateId ? (
            <button className="secondary-button w-full sm:w-fit" onClick={onCancelTemplateEdit} type="button">
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export function TemplateLibraryPanel({
  templates,
  onEditTemplate,
}: Pick<TemplateProps, "templates" | "onEditTemplate">) {
  return (
    <div className="panel-shell">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Biblioteca de mensagens</span>
          <h2 className="panel-title">Templates cadastrados</h2>
        </div>
        <span className="text-sm text-[color:var(--color-muted)]">{templates.length} templates cadastrados</span>
      </div>

      <div className="mt-5 grid gap-3">
        {templates.map((template) => (
          <article key={template.id} className="interactive-card px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                  {template.category}
                </p>
                <h3 className="mt-2 font-serif text-2xl tracking-[-0.04em] text-[color:var(--color-ink)]">
                  {template.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{template.body}</p>
              </div>
              <button
                className="secondary-button px-4 py-2"
                onClick={() => onEditTemplate(template)}
                type="button"
              >
                Ajustar template
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

type Props = FlowProps & TemplateProps;

export function AutomationAssetsPanel(props: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <FlowEditorPanel {...props} />
      <FlowLibraryPanel {...props} />
      <TemplateEditorPanel {...props} />
      <TemplateLibraryPanel {...props} />
    </div>
  );
}
