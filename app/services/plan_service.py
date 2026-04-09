from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.domain import Plan, PlanFeature
from app.utils.serialization import sanitize_mongo_document


class PlanService:
    def __init__(self, db=None):
        self.db = db

    @staticmethod
    def default_plans() -> list[Plan]:
        settings = get_settings()
        return [
            Plan(
                name="starter",
                price_monthly=97.0,
                description="Plano inicial com automacoes basicas e dashboard essencial.",
                checkout_url=settings.public_checkout_starter_url or None,
                highlight="Ideal para operacoes iniciando no WhatsApp.",
                features=[
                    PlanFeature(key="numbers", label="1 numero", limit=1),
                    PlanFeature(key="monthly_messages", label="500 mensagens por mes", limit=500),
                    PlanFeature(key="users", label="2 usuarios", limit=2),
                    PlanFeature(key="rules", label="10 regras", limit=10),
                    PlanFeature(key="flows", label="5 fluxos", limit=5),
                    PlanFeature(key="templates", label="5 templates", limit=5),
                    PlanFeature(key="basic_automation", label="Respostas automaticas basicas"),
                    PlanFeature(key="intent_classification", label="Classificacao simples"),
                    PlanFeature(key="basic_dashboard", label="Dashboard basico"),
                    PlanFeature(key="advanced_ai", label="IA generativa avancada", enabled=False),
                    PlanFeature(key="real_time_refresh", label="Atualizacao em tempo real", enabled=False),
                ],
            ),
            Plan(
                name="smarter",
                price_monthly=297.0,
                description="Plano completo com IA contextual, metricas avancadas e operacao multiatendente.",
                checkout_url=settings.public_checkout_smarter_url or None,
                highlight="Para equipes que precisam escalar atendimento e vendas.",
                features=[
                    PlanFeature(key="numbers", label="Multiplos numeros", limit=10),
                    PlanFeature(key="monthly_messages", label="10000 mensagens por mes", limit=10000),
                    PlanFeature(key="users", label="25 usuarios", limit=25),
                    PlanFeature(key="rules", label="200 regras", limit=200),
                    PlanFeature(key="flows", label="50 fluxos", limit=50),
                    PlanFeature(key="templates", label="100 templates", limit=100),
                    PlanFeature(key="contextual_ai", label="IA contextual"),
                    PlanFeature(key="advanced_dashboard", label="Dashboard avancado"),
                    PlanFeature(key="human_handoff", label="Multiplos atendentes"),
                    PlanFeature(key="health_score", label="Termometro da empresa"),
                    PlanFeature(key="integrations", label="Integracoes extras"),
                    PlanFeature(key="real_time_refresh", label="Atualizacao em tempo real"),
                ],
            ),
        ]

    async def get_plan_by_name(self, plan_name: str) -> dict:
        if self.db is None:
            for plan in self.default_plans():
                if plan.name == plan_name:
                    return plan.model_dump()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plano nao encontrado")

        plan = sanitize_mongo_document(await self.db.plans.find_one({"name": plan_name}))
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plano nao encontrado")
        return plan

    @staticmethod
    def get_feature_limit(plan: dict, key: str) -> int | None:
        for feature in plan.get("features", []):
            if feature.get("key") == key:
                return feature.get("limit")
        return None

    @staticmethod
    def has_feature(plan: dict, key: str) -> bool:
        for feature in plan.get("features", []):
            if feature.get("key") == key:
                return feature.get("enabled", True)
        return False

    async def build_usage_snapshot(self, tenant_id: str) -> dict:
        if self.db is None:
            raise RuntimeError("PlanService requires a database for usage snapshots")

        tenant = sanitize_mongo_document(await self.db.tenants.find_one({"id": tenant_id}))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant nao encontrado")

        plan = await self.get_plan_by_name(tenant["plan_name"])
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        monthly_messages = await self.db.messages.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": month_start}})
        active_users = await self.db.users.count_documents({"tenant_id": tenant_id, "is_active": True})
        active_rules = await self.db.automation_rules.count_documents({"tenant_id": tenant_id})
        active_flows = await self.db.automation_flows.count_documents({"tenant_id": tenant_id})
        active_templates = await self.db.message_templates.count_documents({"tenant_id": tenant_id})
        numbers_connected = 1 if (
            tenant.get("meta_phone_number_id")
            or (tenant.get("channel_provider") == "twilio" and tenant.get("twilio_whatsapp_number"))
        ) else 0

        metrics = {
            "monthly_messages": monthly_messages,
            "users": active_users,
            "rules": active_rules,
            "flows": active_flows,
            "templates": active_templates,
            "numbers": numbers_connected,
        }

        limits: dict[str, dict] = {}
        alerts: list[str] = []
        for key, used in metrics.items():
            limit = self.get_feature_limit(plan, key)
            usage_percent = int((used / limit) * 100) if limit else 0
            limits[key] = {
                "used": used,
                "limit": limit,
                "remaining": None if limit is None else max(limit - used, 0),
                "within_limit": True if limit is None else used <= limit,
                "usage_percent": usage_percent,
            }
            if limit is not None and used >= limit:
                alerts.append(f"Limite de {key} atingido no plano {plan['name']}.")

        onboarding = [
            {"key": "signup", "label": "Conta criada", "completed": True},
            {
                "key": "channel",
                "label": "Canal WhatsApp conectado",
                "completed": bool(
                    (
                        tenant.get("channel_provider") == "meta"
                        and tenant.get("meta_phone_number_id")
                        and (tenant.get("meta_access_token") or tenant.get("meta_access_token_encrypted"))
                    )
                    or (
                        tenant.get("channel_provider") == "twilio"
                        and (tenant.get("twilio_account_sid") or tenant.get("twilio_account_sid_encrypted"))
                        and (tenant.get("twilio_auth_token") or tenant.get("twilio_auth_token_encrypted"))
                        and tenant.get("twilio_whatsapp_number")
                    )
                ),
            },
            {"key": "rules", "label": "Primeiras regras publicadas", "completed": active_rules > 0},
            {"key": "flow", "label": "Fluxo por intencao criado", "completed": active_flows > 0},
            {"key": "team", "label": "Equipe cadastrada", "completed": active_users > 1},
        ]

        return {
            "plan": plan,
            "usage": limits,
            "alerts": alerts,
            "onboarding": onboarding,
        }

    async def enforce_limit(self, tenant_id: str, metric_key: str, attempted_total: int | None = None) -> None:
        snapshot = await self.build_usage_snapshot(tenant_id)
        metric = snapshot["usage"].get(metric_key)
        if not metric or metric.get("limit") is None:
            return

        current_total = metric["used"]
        final_total = attempted_total if attempted_total is not None else current_total + 1
        if final_total > metric["limit"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Limite do plano atingido para {metric_key}. Faca upgrade para continuar.",
            )
