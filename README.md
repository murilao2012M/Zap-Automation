# Zap Automation MVP

Backend base para um SaaS de automacao de WhatsApp Business para pequenas e medias empresas.

## Stack

- FastAPI
- MongoDB
- JWT + RBAC simples
- Scikit-learn para classificacao de intencao
- Camada de regras + camada de IA preparada para LLM

## Modulos principais

- `Auth Service`: login, usuarios, empresas e planos
- `Tenant Service`: isolamento multi-tenant por `tenant_id`
- `Message Service`: entrada, saida e historico de mensagens
- `Automation Engine`: regras, fluxos por intencao, templates e fallback humano
- `AI Service`: classificacao de intencao, resposta sugerida e sentimento
- `Metrics Service`: termometro operacional por empresa
- `Meta WhatsApp Service`: envio real pela WhatsApp Cloud API
- `Twilio WhatsApp Service`: envio real via Twilio WhatsApp Sandbox/API

## Como executar

1. Copie `.env.example` para `.env`
2. Suba o MongoDB e a API:

```bash
docker compose up
```

3. Acesse:

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

## Variaveis novas importantes

- `WHATSAPP_VERIFY_TOKEN`: token do webhook da Meta
- `WHATSAPP_APP_SECRET`: segredo do app para validar assinatura do webhook
- `WHATSAPP_API_VERSION`: versao do Graph API, ex. `v21.0`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`: credenciais do canal Twilio
- `SENTRY_DSN`: monitoramento de erros e traces no backend
- `PUBLIC_CHECKOUT_STARTER_URL` e `PUBLIC_CHECKOUT_SMARTER_URL`: links de compra/upgrade
- `RATE_LIMIT_REQUESTS` e `RATE_LIMIT_WINDOW_SECONDS`: limitador de requisicoes do MVP

## O que ja esta pronto

- configuracao do canal Meta por tenant
- configuracao do canal Twilio por tenant
- processamento de webhook simulado e webhook real da Meta
- processamento de webhook Twilio em `POST /api/v1/webhook/whatsapp/twilio`
- simulacao local de webhook Meta em `POST /api/v1/webhook/whatsapp/dev/meta-sample`
- envio manual humano e envio automatico com tentativa de despacho real
- CRUD de regras, fluxos e templates por tenant
- dashboard com uso do plano, onboarding e alertas comerciais
- busca/filtros na fila de conversas

## Testes locais recomendados

- validar webhook GET em `GET /api/v1/webhook/whatsapp?hub.mode=subscribe&hub.challenge=123456&hub.verify_token=meta-verify-token`
- simular mensagem simples pelo painel em `Operacoes > Simular mensagem`
- simular payload realista da Meta pelo painel em `Operacoes > Simular evento Meta`

## Endpoints de monitoramento

- Backend liveness: `GET /healthz`
- Backend readiness: `GET /readyz`
- Frontend liveness: `GET /api/health`

## Credenciais iniciais

No startup, a aplicacao tenta criar:

- admin padrao
- tenant demo
- planos `starter` e `smarter`

## Saida padrao

Todas as respostas da API sao JSON e os registros sao persistidos no MongoDB.
