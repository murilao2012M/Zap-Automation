import type { BotSettings } from "@/lib/api";

type Props = {
  botSettings: BotSettings;
  saving: boolean;
  feedback: string;
  onChange: (settings: BotSettings) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function BotSettingsPanel({ botSettings, saving, feedback, onChange, onSubmit }: Props) {
  return (
    <div className="panel-shell sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Configuração do bot</span>
          <h2 className="panel-title">Operação automatizada</h2>
        </div>
      </div>

      <form className="mt-4 grid gap-3.5" onSubmit={onSubmit}>
        <label className="soft-card flex items-center justify-between px-4 py-3.5">
          <div>
            <span className="field-label">Bot ativo</span>
            <p className="text-sm text-[color:var(--color-muted)]">Controle geral do atendimento automatizado.</p>
          </div>
          <input
            checked={botSettings.bot_enabled}
            className="h-5 w-5"
            onChange={(event) => onChange({ ...botSettings, bot_enabled: event.target.checked })}
            type="checkbox"
          />
        </label>

        <div className="grid gap-3.5 md:grid-cols-3">
          <label>
            <span className="field-label">Início</span>
            <input
              className="field-input"
              type="time"
              value={botSettings.business_hours.start}
              onChange={(event) =>
                onChange({
                  ...botSettings,
                  business_hours: { ...botSettings.business_hours, start: event.target.value },
                })
              }
            />
          </label>
          <label>
            <span className="field-label">Fim</span>
            <input
              className="field-input"
              type="time"
              value={botSettings.business_hours.end}
              onChange={(event) =>
                onChange({
                  ...botSettings,
                  business_hours: { ...botSettings.business_hours, end: event.target.value },
                })
              }
            />
          </label>
          <label>
            <span className="field-label">Timezone</span>
            <input
              className="field-input"
              value={botSettings.business_hours.timezone}
              onChange={(event) =>
                onChange({
                  ...botSettings,
                  business_hours: { ...botSettings.business_hours, timezone: event.target.value },
                })
              }
            />
          </label>
        </div>

        {[
          ["Mensagem de boas-vindas", "welcome_message"],
          ["Mensagem de fallback", "fallback_message"],
          ["Mensagem de handoff", "handoff_message"],
          ["Mensagem fora do horário", "after_hours_message"],
        ].map(([label, key]) => (
          <label key={key}>
            <span className="field-label">{label}</span>
            <textarea
              className="field-input min-h-24 resize-y"
              value={botSettings[key as keyof BotSettings] as string}
              onChange={(event) => onChange({ ...botSettings, [key]: event.target.value })}
            />
          </label>
        ))}

        {feedback ? (
          <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${feedback.includes("sucesso") ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
            {feedback}
          </p>
        ) : null}

        <button className="primary-button w-full sm:w-fit" disabled={saving} type="submit">
          {saving ? "Salvando ajustes..." : "Salvar ajustes do bot"}
        </button>
      </form>
    </div>
  );
}
