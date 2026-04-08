from app.core.config import get_settings
from app.core.security import hash_password
from app.schemas.domain import Tenant, User
from app.services.automation_service import AutomationService
from app.services.plan_service import PlanService


class BootstrapService:
    def __init__(self, db):
        self.db = db

    async def seed(self) -> None:
        automation_service = AutomationService(self.db)
        for plan in PlanService.default_plans():
            await self.db.plans.update_one({"name": plan.name}, {"$set": plan.model_dump()}, upsert=True)

        tenant = await self.db.tenants.find_one({"slug": "demo-company"})
        if not tenant:
            demo_tenant = Tenant(name="Demo Company", slug="demo-company", plan_name="smarter", status="active")
            await self.db.tenants.insert_one(demo_tenant.model_dump())
            tenant = demo_tenant.model_dump()
        await automation_service.ensure_default_rules(tenant["id"])

        settings = get_settings()
        user = await self.db.users.find_one({"email": settings.default_admin_email})
        if not user:
            admin = User(
                tenant_id=tenant["id"],
                name="Admin",
                email=settings.default_admin_email,
                password_hash=hash_password(settings.default_admin_password),
                role="owner",
            )
            await self.db.users.insert_one(admin.model_dump())
