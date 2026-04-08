"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { getPlans, type Plan } from "@/lib/api";
import { LoginForm } from "@/components/login-form";
import { SiteFooter } from "@/components/site-footer";
import { SignupForm } from "@/components/signup-form";
import { ThemeToggle } from "@/components/theme-toggle";

type Tab = "signup" | "login";

export function AuthShell() {
  const [activeTab, setActiveTab] = useState<Tab>("signup");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansError, setPlansError] = useState("");

  useEffect(() => {
    async function loadPlans() {
      try {
        const result = await getPlans();
        setPlans(result);
      } catch (error) {
        setPlansError(error instanceof Error ? error.message : "Não foi possível carregar os planos.");
      }
    }

    void loadPlans();
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(20,83,45,0.08),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(9,41,22,0.08),transparent)]" />
      <section className="relative mx-auto grid w-full max-w-[1620px] flex-1 gap-3 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 xl:grid-cols-[minmax(0,1.12fr)_408px] 2xl:grid-cols-[minmax(0,1.16fr)_430px]">
        <div className="glass-panel surface-noise relative overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(187,106,50,0.18),transparent_68%)]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(20,83,45,0.04))]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image src="/zap-automation-logo.svg" alt="Zap Automation" width={48} height={48} className="h-12 w-12 rounded-2xl shadow-[0_10px_24px_rgba(17,34,24,0.12)]" />
              <div className="space-y-1">
                <span className="pill">Zap Automation</span>
                <p className="text-sm text-[color:var(--color-muted)]">Automação comercial para WhatsApp Business</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div className="relative mt-7 max-w-[52rem] lg:mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[rgba(153,61,88,0.22)] bg-[rgba(153,61,88,0.16)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(214,146,166)]">
                automação para pequenas e médias empresas
              </span>
              <span className="rounded-full border border-[rgba(153,61,88,0.22)] bg-[rgba(153,61,88,0.16)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(235,180,194)]">
                WhatsApp Business + IA
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl font-serif text-[2.55rem] leading-[0.94] tracking-[-0.06em] text-[color:var(--color-ink)] sm:text-[3.35rem] lg:text-[4.25rem]">
              Venda, atenda e acompanhe clientes com mais velocidade no WhatsApp.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)] sm:text-[15px] lg:text-base">
              O Zap Automation foi pensado para empresas que precisam responder rápido, organizar
              conversas, automatizar tarefas repetitivas e transformar atendimento em crescimento.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="secondary-button px-4 py-2 text-xs sm:text-sm">Onboarding em poucos minutos</span>
              <span className="secondary-button px-4 py-2 text-xs sm:text-sm">Fluxos por nicho</span>
              <span className="secondary-button px-4 py-2 text-xs sm:text-sm">Operação com handoff humano</span>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Mais agilidade", "Reduza o tempo de resposta e mantenha sua operação sempre ativa."],
              ["Mais organização", "Centralize contatos, conversas, equipe e automações em um único fluxo."],
              ["Mais conversão", "Use IA e regras inteligentes para atender melhor e vender mais."],
            ].map(([title, text]) => (
              <article key={title} className="dashboard-card p-4">
                <strong className="block text-base font-semibold text-[color:var(--color-ink)]">{title}</strong>
                <p className="mt-1.5 text-sm leading-6 text-[color:var(--color-muted)]">{text}</p>
              </article>
            ))}
          </div>

          <div className="section-shell surface-noise relative mt-5 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                  O que sua empresa ganha
                </p>
                <h3 className="mt-2 font-serif text-[1.85rem] tracking-[-0.04em] text-[color:var(--color-ink)] sm:text-[2.2rem]">
                  Um atendimento mais inteligente e profissional
                </h3>
              </div>
              <span className="pill w-fit">foco em resultado</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                ["Automação no WhatsApp", "Respostas rápidas, gatilhos, menus e encaminhamento inteligente para reduzir trabalho manual."],
                ["IA aplicada ao atendimento", "Classifique intenções, sugira respostas e acompanhe a qualidade das conversas."],
                ["Painel de acompanhamento", "Visualize métricas, operação da equipe e o termômetro da empresa em tempo real."],
                ["Estrutura para crescer", "Comece simples e evolua para um fluxo mais robusto com múltiplos usuários e integrações."],
              ].map(([title, text]) => (
                <article key={title} className="dashboard-card p-4">
                  <h4 className="font-serif text-xl tracking-[-0.04em] text-[color:var(--color-ink)]">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="section-shell relative mt-5 bg-[rgba(20,83,45,0.06)] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                  Planos do produto
                </p>
                <h3 className="mt-2 font-serif text-[1.8rem] tracking-[-0.04em] text-[color:var(--color-ink)]">
                  Escolha o nível ideal para sua operação
                </h3>
              </div>
              <span className="pill w-fit">{plans.length || 2} opções</span>
            </div>

            {plansError ? (
              <p className="mt-4 rounded-2xl border border-[rgba(255,120,120,0.22)] bg-[rgba(120,28,28,0.16)] px-4 py-3 text-sm font-medium text-[rgb(255,196,196)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {plansError}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {plans.map((plan) => (
                <article key={plan.id} className="dashboard-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                        {plan.name}
                      </p>
                      <h4 className="mt-2 font-serif text-2xl tracking-[-0.04em] text-[color:var(--color-ink)]">
                        R$ {plan.price_monthly.toFixed(0)}
                      </h4>
                    </div>
                    <span className="rounded-full bg-[color:var(--color-brand-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand)]">
                      / mês
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{plan.description}</p>
                  {plan.highlight ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand)]">{plan.highlight}</p> : null}
                  <ul className="mt-3 grid gap-2">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={feature.key} className="text-sm leading-6 text-[color:var(--color-muted)]">
                        {feature.enabled ? "Inclui" : "Não inclui"}: {feature.label}
                      </li>
                    ))}
                  </ul>
                  {plan.checkout_url ? (
                    <a className="secondary-button mt-4 inline-flex w-full items-center justify-center" href={plan.checkout_url} rel="noreferrer" target="_blank">
                      Comprar plano
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="section-shell surface-noise relative mt-5 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                  Fluxo de demonstração
                </p>
                <h3 className="mt-2 font-serif text-[1.8rem] tracking-[-0.04em] text-[color:var(--color-ink)]">
                  Veja como a operação acontece do primeiro contato ao fechamento
                </h3>
              </div>
              <span className="pill w-fit">pronto para vender</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["1. Entrada", "A mensagem chega no WhatsApp e entra na fila da operação."],
                ["2. Triagem", "O bot identifica a intenção e aplica a regra ou fluxo correto."],
                ["3. Ação", "A conversa segue com resposta automática ou handoff humano."],
                ["4. Gestão", "A equipe acompanha tudo no painel, com métricas e histórico."],
              ].map(([title, text]) => (
                <article key={title} className="dashboard-card p-4">
                  <h4 className="font-serif text-lg tracking-[-0.04em] text-[color:var(--color-ink)]">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel surface-noise h-fit px-4 py-4 sm:px-4 sm:py-4 xl:sticky xl:top-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-[color:var(--color-line)] px-2 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--color-muted)]">Primeiro acesso</p>
              <h2 className="mt-2 font-serif text-2xl tracking-[-0.04em] text-[color:var(--color-ink)]">
                {activeTab === "signup" ? "Crie sua operação" : "Entre na sua conta"}
              </h2>
            </div>
            <span className="pill w-fit">Online</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-[22px] border border-[rgba(89,132,104,0.18)] bg-[rgba(14,27,20,0.74)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" role="tablist" aria-label="Acesso">
            <button
              className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                activeTab === "signup"
                  ? "bg-[linear-gradient(135deg,rgba(104,198,131,0.95),rgba(72,145,96,0.96))] text-[#07110b] shadow-[0_12px_24px_rgba(72,145,96,0.24)]"
                  : "bg-[rgba(153,61,88,0.14)] text-[rgb(214,146,166)] hover:bg-[rgba(153,61,88,0.24)] hover:text-[rgb(244,210,220)]"
              }`}
              onClick={() => setActiveTab("signup")}
              type="button"
            >
              Criar conta
            </button>
            <button
              className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                activeTab === "login"
                  ? "bg-[linear-gradient(135deg,rgba(104,198,131,0.95),rgba(72,145,96,0.96))] text-[#07110b] shadow-[0_12px_24px_rgba(72,145,96,0.24)]"
                  : "bg-[rgba(153,61,88,0.14)] text-[rgb(214,146,166)] hover:bg-[rgba(153,61,88,0.24)] hover:text-[rgb(244,210,220)]"
              }`}
              onClick={() => setActiveTab("login")}
              type="button"
            >
              Entrar
            </button>
          </div>

          {activeTab === "signup" ? <SignupForm onSwitchToLogin={() => setActiveTab("login")} /> : <LoginForm />}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
