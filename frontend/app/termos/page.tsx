export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[980px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="glass-panel surface-noise px-6 py-6 sm:px-8 sm:py-8">
        <span className="pill">Termos de uso</span>
        <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-[color:var(--color-ink)]">
          Condições para uso da plataforma
        </h1>
        <div className="mt-6 grid gap-6 text-sm leading-7 text-[color:var(--color-muted)]">
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">1. Objeto</h2>
            <p className="mt-2">
              O Zap Automation oferece recursos para atendimento, automação operacional e gestão
              de conversas no WhatsApp para empresas contratantes.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">2. Responsabilidade da conta</h2>
            <p className="mt-2">
              Cada empresa é responsável pelo uso das credenciais, pelos conteúdos enviados e pela
              configuração correta de seus fluxos, regras, integrações e usuários internos.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">3. Uso permitido</h2>
            <p className="mt-2">
              A plataforma não poderá ser utilizada para spam, fraude, assédio, envio de conteúdo
              ilícito ou violação das políticas oficiais do WhatsApp, Meta e Twilio.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">4. Disponibilidade</h2>
            <p className="mt-2">
              Empregamos esforço técnico para manter a operação estável, mas integrações externas,
              provedores e eventos de rede podem afetar temporariamente a disponibilidade.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">5. Cancelamento</h2>
            <p className="mt-2">
              A empresa contratante poderá solicitar cancelamento conforme o plano contratado e as
              condições comerciais vigentes no momento da assinatura.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
