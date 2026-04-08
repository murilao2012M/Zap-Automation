from pydantic import BaseModel


class HealthScoreResponse(BaseModel):
    tenant_id: str
    health_score: int
    status: str
    factors: dict[str, int]
    alerts: list[str]
