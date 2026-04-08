import type { ConversationMessage, ConversationSummary } from "@/lib/api";

type ConversationFilters = {
  status: "all" | "bot" | "human" | "closed";
  intent: string;
  search: string;
};

type Props = {
  conversations: ConversationSummary[];
  filteredConversations: ConversationSummary[];
  selectedConversationId: string | null;
  selectedConversation: ConversationSummary | null;
  messages: ConversationMessage[];
  filters: ConversationFilters;
  replyDraft: string;
  replying: boolean;
  replyFeedback: string;
  replyError: string;
  autoRefreshEnabled: boolean;
  refreshIntervalSeconds: number;
  onSelectConversation: (conversationId: string) => void;
  onHandoff: (conversationId: string) => void;
  onResume: (conversationId: string) => void;
  onReplyDraftChange: (value: string) => void;
  onSendReply: (event: React.FormEvent<HTMLFormElement>) => void;
  onFilterChange: (filters: ConversationFilters) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefreshIntervalChange: (seconds: number) => void;
  onRefreshNow: () => void;
};

export function ConversationsPanel({
  conversations,
  filteredConversations,
  selectedConversationId,
  selectedConversation,
  messages,
  filters,
  replyDraft,
  replying,
  replyFeedback,
  replyError,
  autoRefreshEnabled,
  refreshIntervalSeconds,
  onSelectConversation,
  onHandoff,
  onResume,
  onReplyDraftChange,
  onSendReply,
  onFilterChange,
  onAutoRefreshChange,
  onRefreshIntervalChange,
  onRefreshNow,
}: Props) {
  const humanCount = filteredConversations.filter((conversation) => conversation.status === "human").length;
  const botCount = filteredConversations.filter((conversation) => conversation.status === "bot").length;
  const criticalCount = filteredConversations.filter((conversation) => conversation.sentiment === "negative").length;

  function formatStatus(status: ConversationSummary["status"]) {
    if (status === "human") return "Humano";
    if (status === "closed") return "Fechada";
    return "Bot";
  }

  const availableIntents = Array.from(
    new Set(
      conversations
        .map((conversation) => conversation.current_intent)
        .filter((intent): intent is string => Boolean(intent)),
    ),
  ).sort();

  return (
    <div className="panel-shell">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Monitoramento de conversas</span>
          <h2 className="panel-title">Fila e handoff humano</h2>
        </div>
        <span className="text-sm text-[color:var(--color-muted)]">
          {filteredConversations.length} de {conversations.length} conversas
        </span>
      </div>

      <div className="section-shell mt-5 grid gap-4 px-4 py-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label>
            <span className="field-label">Status</span>
            <select className="field-input" value={filters.status} onChange={(event) => onFilterChange({ ...filters, status: event.target.value as ConversationFilters["status"] })}>
              <option value="all">Todos</option>
              <option value="bot">Bot</option>
              <option value="human">Humano</option>
              <option value="closed">Fechada</option>
            </select>
          </label>
          <label>
            <span className="field-label">Intenção</span>
            <select className="field-input" value={filters.intent} onChange={(event) => onFilterChange({ ...filters, intent: event.target.value })}>
              <option value="">Todas</option>
              {availableIntents.map((intent) => (
                <option key={intent} value={intent}>
                  {intent}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Busca</span>
            <input className="field-input" value={filters.search} onChange={(event) => onFilterChange({ ...filters, search: event.target.value })} placeholder="Nome, telefone ou última mensagem" />
          </label>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <label className="toggle-card flex items-center gap-3">
              <input checked={autoRefreshEnabled} onChange={(event) => onAutoRefreshChange(event.target.checked)} type="checkbox" />
              <span className="text-sm text-[color:var(--color-ink)]">Auto-refresh</span>
            </label>
            <label>
              <span className="field-label">Intervalo</span>
              <select className="field-input" value={refreshIntervalSeconds} onChange={(event) => onRefreshIntervalChange(Number(event.target.value))}>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </label>
          </div>
        </div>
        <button className="secondary-button px-4 py-2" onClick={onRefreshNow} type="button">
          Atualizar agora
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="soft-card">
          <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Com bot</span>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">{botCount}</p>
        </article>
        <article className="soft-card">
          <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Em handoff</span>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">{humanCount}</p>
        </article>
        <article className="soft-card">
          <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Atenção</span>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">{criticalCount}</p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-1">
          {filteredConversations.length ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`interactive-card w-full px-4 py-4 text-left ${
                  selectedConversationId === conversation.id
                    ? "border-[color:var(--color-brand)] bg-[linear-gradient(180deg,rgba(220,239,220,0.95),rgba(220,239,220,0.72))] shadow-[0_18px_36px_rgba(20,83,45,0.12)]"
                    : ""
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">{conversation.contact_name ?? "Contato sem nome"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">{conversation.contact_phone ?? "sem telefone"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    conversation.status === "human"
                      ? "bg-amber-100 text-amber-700"
                      : conversation.status === "closed"
                        ? "bg-zinc-200 text-zinc-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {formatStatus(conversation.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">{conversation.last_message_preview ?? "Sem mensagens recentes."}</p>
                <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                  Intenção: {conversation.current_intent ?? "não identificada"} | Sentimento: {conversation.sentiment}
                </p>
              </button>
            ))
          ) : (
            <div className="soft-card border-dashed px-4 py-10 text-center text-sm text-[color:var(--color-muted)]">
              Nenhuma conversa encontrada com os filtros selecionados.
            </div>
          )}
        </div>

        <div className="dashboard-card px-4 py-4 sm:px-5 sm:py-5">
          {selectedConversation ? (
            <>
              <div className="flex flex-col gap-4 border-b border-[color:var(--color-line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">Conversa selecionada</p>
                  <h3 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[color:var(--color-ink)]">
                    {selectedConversation.contact_name ?? "Contato"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                    {selectedConversation.contact_phone} | Motivo do handoff: {selectedConversation.handoff_reason ?? "não informado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedConversation.status === "human" ? (
                    <button className="secondary-button px-4 py-2" onClick={() => onResume(selectedConversation.id)} type="button">
                      Devolver ao bot
                    </button>
                  ) : (
                    <button className="primary-button px-4 py-2" onClick={() => onHandoff(selectedConversation.id)} type="button">
                      Assumir humano
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                      message.direction === "incoming"
                        ? "border border-[color:var(--color-line)] bg-[color:var(--color-sand)] text-[color:var(--color-ink)]"
                        : "ml-auto bg-[color:var(--color-brand)] text-white"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`mt-2 text-[11px] uppercase tracking-[0.18em] ${message.direction === "incoming" ? "text-[color:var(--color-muted)]" : "text-white/70"}`}>
                      {message.direction} {message.intent ? `| ${message.intent}` : ""}
                    </p>
                  </div>
                ))}
              </div>

              <form className="mt-5 grid gap-3 border-t border-[color:var(--color-line)] pt-5" onSubmit={onSendReply}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">Resposta humana</p>
                    <p className="text-xs leading-5 text-[color:var(--color-muted)]">Envie uma mensagem manual sem sair do painel.</p>
                  </div>
                </div>
                <textarea
                  className="field-input min-h-28 resize-y"
                  value={replyDraft}
                  onChange={(event) => onReplyDraftChange(event.target.value)}
                  placeholder="Digite a resposta do atendente..."
                  required
                />
                {replyError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{replyError}</p> : null}
                {replyFeedback ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{replyFeedback}</p> : null}
                <button className="primary-button w-full sm:w-fit" disabled={replying} type="submit">
                  {replying ? "Enviando resposta..." : "Enviar resposta humana"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center text-center">
              <div>
                <span className="pill">Sem conversa</span>
                <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
                  Envie uma mensagem de teste ou aguarde novas conversas para monitorar o atendimento.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
