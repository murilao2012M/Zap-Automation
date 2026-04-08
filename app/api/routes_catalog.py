from fastapi import APIRouter, Depends
from pymongo.errors import PyMongoError

from app.api.deps import get_db
from app.schemas.common import APIResponse
from app.services.plan_service import PlanService
from app.utils.serialization import sanitize_mongo_document

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/plans", response_model=APIResponse)
async def list_plans(db=Depends(get_db)):
    try:
        plans = [sanitize_mongo_document(plan) for plan in await db.plans.find().to_list(length=50)]
    except PyMongoError:
        plans = [plan.model_dump() for plan in PlanService.default_plans()]
    return APIResponse(message="Planos carregados com sucesso", data=plans)
