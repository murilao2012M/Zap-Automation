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
              Coletamos informações necessárias para autenticação, operação da conta, histórico de
              conversas, integração com provedores e uso da plataforma.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">2. Finalidade</h2>
            <p className="mt-2">
              Os dados são utilizados para viabilizar atendimento automatizado, operação comercial,
              auditoria técnica, suporte e evolução da experiência do cliente.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">3. Compartilhamento</h2>
            <p className="mt-2">
              O compartilhamento ocorre apenas quando necessário para execução do serviço, como nas
              integrações com infraestrutura, Meta, Twilio ou parceiros operacionais autorizados.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">4. Segurança</h2>
            <p className="mt-2">
              Adotamos controles de acesso, separação por tenant, autenticação e medidas técnicas
              para reduzir exposição indevida de dados e credenciais.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">5. Solicitações</h2>
            <p className="mt-2">
              Solicitações de ajuste, exclusão, exportação ou suporte relacionados à conta devem ser
              encaminhadas pelos canais oficiais da empresa responsável pela contratação.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
