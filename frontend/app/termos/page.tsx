import { sitePublicConfig } from "@/lib/site-config";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[980px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="glass-panel surface-noise px-6 py-6 sm:px-8 sm:py-8">
        <span className="pill">Termos de uso</span>
        <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-[color:var(--color-ink)]">
          Condicoes para uso da plataforma
        </h1>
        <div className="mt-6 grid gap-6 text-sm leading-7 text-[color:var(--color-muted)]">
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">1. Objeto</h2>
            <p className="mt-2">
              O Zap Automation oferece recursos para atendimento, automacao operacional, gestao de
              conversas, filas, handoff e acompanhamento comercial no WhatsApp para empresas
              contratantes.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">2. Responsabilidade da conta</h2>
            <p className="mt-2">
              Cada empresa e responsavel pelo uso das credenciais, pela definicao de usuarios,
              fluxos, templates, regras, politicas internas e conteudo enviado aos contatos finais.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">3. Uso permitido</h2>
            <p className="mt-2">
              A plataforma nao pode ser utilizada para spam, fraude, assedio, conteudo ilicito,
              disparos sem base legal ou violacao das politicas do WhatsApp, Meta, Twilio ou de
              outros provedores conectados.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">4. Integracoes e disponibilidade</h2>
            <p className="mt-2">
              O servico depende de provedores externos, infraestrutura em nuvem e conectividade de
              rede. Podem ocorrer indisponibilidades temporarias, limites operacionais ou bloqueios
              originados em provedores terceiros.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">5. Pagamento, renovacao e cancelamento</h2>
            <p className="mt-2">
              A contratacao pode ocorrer por checkout online, link comercial ou proposta assistida.
              Regras de renovacao, reajuste, cancelamento e suporte seguem o plano contratado e os
              termos comerciais vigentes na data da assinatura.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">6. Suporte e contato</h2>
            <p className="mt-2">
              Demandas operacionais, incidentes, suporte tecnico e solicitacoes contratuais devem ser
              registradas pelos canais oficiais informados no onboarding.
              {sitePublicConfig.legalEmail ? ` Contato legal principal: ${sitePublicConfig.legalEmail}.` : ""}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
