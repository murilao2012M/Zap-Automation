import type { DashboardResponse, HealthResponse, Plan } from "@/lib/api";

type Props = {
  dashboard: DashboardResponse | null;
  health: HealthResponse | null;
  selectedPlan: Plan | null;
  activePlanName: string | null | undefined;
};

export function DashboardOverview({ dashboard, health, selectedPlan, activePlanName }: Props) {
  const cards = [
    ["Mensagens", String(dashboard?.totals.messages ?? 0), "Volume total processado neste tenant."],
    ["Conversas", String(dashboard?.totals.conversations ?? 0), "Atendimentos ativos e históricos disponíveis."],
    ["Health score", String(health?.health_score ?? 0), `Status atual: ${health?.status ?? "indefinido"}.`],
    ["Plano", selectedPlan?.name ?? activePlanName ?? "trial", selectedPlan?.highlight ?? selectedPlan?.description ?? "Plano ativo deste ambiente."],
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      {cards.map(([label, value, text], index) => (
        <article
          key={label}
          className={
            index === 0
              ? "surface-noise overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,#0c2f19,#14532d_55%,#1a5a32)] px-5 py-5 text-white shadow-[0_24px_80px_rgba(17,34,24,0.2)] md:col-span-2 xl:col-span-6"
              : "dashboard-card px-4 py-4 md:min-h-[148px] xl:col-span-2"
          }
        >
          <span className={`text-xs font-semibold uppercase tracking-[0.22em] ${index === 0 ? "text-white/70" : "text-[color:var(--color-muted)]"}`}>
            {label}
          </span>
          <strong className={`mt-3 block tracking-[-0.05em] ${index === 0 ? "text-[2.35rem] font-semibold sm:text-[2.8rem]" : "text-[1.8rem] font-semibold text-[color:var(--color-ink)]"}`}>
            {value}
          </strong>
          <p className={`mt-3 max-w-[30ch] text-[13px] leading-6 ${index === 0 ? "text-white/75" : "text-[color:var(--color-muted)]"}`}>{text}</p>
        </article>
      ))}
    </div>
  );
}
