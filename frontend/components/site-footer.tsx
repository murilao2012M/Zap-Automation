"use client";

import Link from "next/link";

type Props = {
  compact?: boolean;
};

export function SiteFooter({ compact = false }: Props) {
  return (
    <footer className={`relative mt-6 w-full ${compact ? "pb-3" : "pb-4 sm:pb-6"}`}>
      <div className="mx-auto w-full max-w-[1620px] px-3 sm:px-5 lg:px-8">
        <div className="glass-panel surface-noise px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[color:var(--color-muted)]">
                Zap Automation
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
                Plataforma para vender, atender e automatizar operações no WhatsApp com mais
                controle, velocidade e inteligência.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link className="secondary-button px-4 py-2.5 text-xs sm:text-sm" href="/">
                Home
              </Link>
              <Link className="secondary-button px-4 py-2.5 text-xs sm:text-sm" href="/dashboard">
                Dashboard
              </Link>
              <Link className="secondary-button px-4 py-2.5 text-xs sm:text-sm" href="/termos">
                Termos
              </Link>
              <Link className="secondary-button px-4 py-2.5 text-xs sm:text-sm" href="/privacidade">
                Privacidade
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-[color:var(--color-line)] pt-4 text-xs text-[color:var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>Zap Automation (c) 2026. Atendimento, vendas e operação conectados em um único painel.</span>
            <span>Feito para empresas que querem responder melhor, vender mais e crescer com consistência.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
