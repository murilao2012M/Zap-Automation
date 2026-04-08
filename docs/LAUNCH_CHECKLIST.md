# Launch Checklist

## Infra de producao

- Provisionar MongoDB gerenciado com backup automatico e alertas.
- Provisionar Redis gerenciado para filas, retry e dead-letter queue.
- Configurar dominio principal e subdominios para `app` e `api`.
- Publicar frontend com HTTPS.
- Publicar backend com HTTPS, CORS restrito e variaveis seguras.
- Configurar monitoramento de uptime e erro para frontend e backend.
- Rotacionar todos os segredos antes do go-live.

## Backend pronto para producao

- Validar `MONGODB_URI` e `REDIS_URL` no ambiente final.
- Confirmar que o endpoint raiz e as rotas criticas respondem sem stacktrace.
- Revisar logs em producao e centralizar em um provedor.
- Confirmar consumo do Redis Stream e da dead-letter queue.
- Revisar auditoria das acoes de autenticacao, atendimento e automacao.
- Executar testes minimos de login, cadastro, webhook e automacoes.

## Produto vendavel

- Revisar onboarding guiado de primeira conexao com WhatsApp.
- Conferir checkout e links comerciais dos planos Starter e Smarter.
- Revisar paginas de Termos, Privacidade e LGPD com apoio juridico.
- Garantir mensagem comercial clara no topo da landing e nas CTAs.
- Definir canal oficial de contato comercial por WhatsApp.

## Operacao do cliente

- Validar inbox com filtros, handoff, retomada do bot e resposta manual.
- Confirmar ownership, status de conversa e auditoria visivel para a equipe.
- Revisar textos de erro para que sejam humanos e orientem a proxima acao.
- Conferir dashboard, eventos operacionais e indicadores minimos de uso.

## Go-live

1. Subir Mongo, Redis, backend e frontend no ambiente final.
2. Rodar smoke test de cadastro, login, dashboard, catalogo e webhook.
3. Conectar numero de WhatsApp real de demonstração.
4. Publicar landing com CTA comercial e oferta inicial simples.
5. Ativar monitoramento e acompanhar os primeiros acessos em tempo real.
