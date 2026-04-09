import { sitePublicConfig } from "@/lib/site-config";

const lgpdTopics = [
  {
    title: "Bases e finalidade",
    text: "O tratamento de dados ocorre para execucao do servico contratado, seguranca da conta, suporte, faturamento e obrigacoes legais ligadas a operacao.",
  },
  {
    title: "Papel das partes",
    text: "Na maior parte dos fluxos, a empresa contratante atua como controladora dos dados dos seus contatos e o Zap Automation atua como operador da plataforma e da infraestrutura contratada.",
  },
  {
    title: "Direitos do titular",
    text: "Titulares podem solicitar confirmacao de tratamento, acesso, correcao, anonimização quando aplicavel, portabilidade e eliminacao conforme a legislacao vigente e o contexto contratual.",
  },
  {
    title: "Suboperadores e provedores",
    text: "A operacao pode envolver provedores como hospedagem, banco de dados, monitoramento, Meta e Twilio. Cada integracao deve ser usada com base legal adequada e politica de seguranca definida pela empresa contratante.",
  },
  {
    title: "Incidentes e comunicacao",
    text: "Incidentes relevantes devem seguir fluxo de registro, avaliacao tecnica e comunicacao conforme gravidade, obrigacoes legais e contratos firmados com o cliente.",
  },
];

export default function LgpdPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[980px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="glass-panel surface-noise px-6 py-6 sm:px-8 sm:py-8">
        <span className="pill">LGPD</span>
        <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-[color:var(--color-ink)]">
          Diretrizes de tratamento de dados para operacao B2B
        </h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
          Esta pagina resume como o produto deve ser operado sob a Lei Geral de Protecao de Dados.
          Ela ajuda no onboarding comercial e tecnico, mas nao substitui revisao juridica especifica
          para cada contrato, nicho ou fluxo sensivel.
        </p>

        <div className="mt-6 grid gap-6 text-sm leading-7 text-[color:var(--color-muted)]">
          {lgpdTopics.map((topic) => (
            <section key={topic.title}>
              <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{topic.title}</h2>
              <p className="mt-2">{topic.text}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-sand)] px-5 py-5 text-sm leading-7 text-[color:var(--color-muted)]">
          <p className="font-semibold text-[color:var(--color-ink)]">Checklist minimo antes do go-live</p>
          <ul className="mt-3 grid gap-2">
            <li>Mapear quais dados pessoais entram em cada automacao e cada webhook.</li>
            <li>Definir o responsavel interno do cliente para aprovar textos, bases legais e retencao.</li>
            <li>Revisar quem acessa o dashboard, com quais papeis e por quanto tempo.</li>
            <li>Validar como incidentes, exportacoes e pedidos de exclusao serao tratados.</li>
          </ul>
          {sitePublicConfig.legalEmail ? (
            <p className="mt-4">
              Contato legal para solicitacoes e revisoes: <strong className="text-[color:var(--color-ink)]">{sitePublicConfig.legalEmail}</strong>.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
