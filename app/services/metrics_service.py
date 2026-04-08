from __future__ import annotations

from app.schemas.analytics import HealthScoreResponse


class MetricsService:
    def __init__(self, db):
        self.db = db

    async def build_health_score(self, tenant_id: str) -> HealthScoreResponse:
        total_messages = await self.db.messages.count_documents({"tenant_id": tenant_id, "direction": "incoming"})
        total_conversations = await self.db.conversations.count_documents({"tenant_id": tenant_id})
        human_handoffs = await self.db.conversations.count_documents({"tenant_id": tenant_id, "status": "human"})
        negative_insights = await self.db.ai_insights.count_documents({"tenant_id": tenant_id, "sentiment": "negative"})

        automation_rate = 100 if total_conversations == 0 else max(0, 100 - int((human_handoffs / total_conversations) * 100))
        customer_sentiment = 100 if total_messages == 0 else max(0, 100 - int((negative_insights / total_messages) * 100))
        response_time = 82
        lead_conversion = min(95, 55 + total_conversations * 3)

        health_score = int((response_time + automation_rate + customer_sentiment + lead_conversion) / 4)
        if health_score < 50:
            status = "critico"
        elif health_score < 70:
            status = "alerta"
        elif health_score < 85:
            status = "bom"
        else:
            status = "excelente"

        alerts: list[str] = []
        if automation_rate < 70:
            alerts.append("Taxa de automacao abaixo da meta.")
        if customer_sentiment < 75:
            alerts.append("Aumento de sinais negativos nas conversas.")
        if not alerts:
            alerts.append("Operacao estavel dentro dos parametros esperados.")

        payload = HealthScoreResponse(
            tenant_id=tenant_id,
            health_score=health_score,
            status=status,
            factors={
                "response_time": response_time,
                "automation_rate": automation_rate,
                "customer_sentiment": customer_sentiment,
                "lead_conversion": lead_conversion,
            },
            alerts=alerts,
        )
        await self.db.health_scores.update_one(
            {"tenant_id": tenant_id},
            {"$set": payload.model_dump()},
            upsert=True,
        )
        return payload
