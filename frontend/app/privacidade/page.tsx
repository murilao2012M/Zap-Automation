import { sitePublicConfig } from "@/lib/site-config";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[980px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="glass-panel surface-noise px-6 py-6 sm:px-8 sm:py-8">
        <span className="pill">Privacidade</span>
        <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-[color:var(--color-ink)]">
          Como tratamos dados e acessos
        </h1>
        <div className="mt-6 grid gap-6 text-sm leading-7 text-[color:var(--color-muted)]">
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">1. Dados coletados</h2>
            <p className="mt-2">
              Coletamos dados de autenticacao, empresas, usuarios, historico de conversas,
              configuracoes de automacao, eventos operacionais e informacoes minimas para manter o
              servico ativo e auditavel.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">2. Finalidade</h2>
            <p className="mt-2">
              Os dados sao usados para executar atendimento automatizado, operacao comercial,
              seguranca da conta, suporte tecnico, faturamento, auditoria e evolucao controlada da
              plataforma.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">3. Compartilhamento</h2>
            <p className="mt-2">
              O compartilhamento ocorre apenas quando necessario para a execucao do servico, como em
              integracoes com infraestrutura, Meta, Twilio, monitoramento de erros e parceiros
              operacionais autorizados.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">4. Seguranca</h2>
            <p className="mt-2">
              Adotamos separacao por tenant, autenticacao, logs operacionais, controles de acesso e
              mecanismos para reduzir exposicao indevida de dados, credenciais e conteudo sensivel.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">5. Retencao e solicitacoes</h2>
            <p className="mt-2">
              Dados podem ser mantidos enquanto houver contrato ativo ou necessidade legal e
              operacional. Solicitacoes de acesso, correcao, exportacao ou exclusao devem ser
              encaminhadas pelos canais oficiais da empresa contratante.
              {sitePublicConfig.legalEmail ? ` Contato principal: ${sitePublicConfig.legalEmail}.` : ""}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
