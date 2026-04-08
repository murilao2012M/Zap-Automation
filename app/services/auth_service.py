from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.auth import RegisterTenantRequest, RegisterUserRequest
from app.schemas.domain import Tenant, User
from app.services.automation_service import AutomationService
from app.services.plan_service import PlanService
from app.utils.serialization import sanitize_mongo_document
from app.utils.text import slugify


class AuthService:
    def __init__(self, db):
        self.db = db
        self.settings = get_settings()

    async def register_user(self, payload: RegisterUserRequest) -> User:
        await PlanService(self.db).enforce_limit(payload.tenant_id, "users")
        normalized_email = str(payload.email).strip().lower()
        existing = await self.db.users.find_one({"email": normalized_email, "tenant_id": payload.tenant_id})
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Usuario ja existe neste tenant")

        user = User(
            tenant_id=payload.tenant_id,
            name=payload.name,
            email=normalized_email,
            password_hash=hash_password(payload.password),
            role=payload.role,
        )
        await self.db.users.insert_one(user.model_dump())
        return user

    async def register_tenant(self, payload: RegisterTenantRequest) -> dict:
        normalized_email = str(payload.owner_email).strip().lower()
        existing_user = await self.db.users.find_one({"email": normalized_email})
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ja existe uma conta com este email")

        plan = sanitize_mongo_document(await self.db.plans.find_one({"name": payload.plan_name}))
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plano nao encontrado")

        slug = slugify(payload.company_name)
        existing_tenant = await self.db.tenants.find_one({"slug": slug})
        if existing_tenant:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ja existe uma empresa com este nome")

        tenant = Tenant(
            name=payload.company_name,
            slug=slug,
            plan_name=payload.plan_name,
            status="trial",
            whatsapp_number=payload.whatsapp_number,
        )
        user = User(
            tenant_id=tenant.id,
            name=payload.owner_name,
            email=normalized_email,
            password_hash=hash_password(payload.owner_password),
            role="owner",
        )

        await self.db.tenants.insert_one(tenant.model_dump())
        await self.db.users.insert_one(user.model_dump())
        await AutomationService(self.db).ensure_default_rules(tenant.id)

        token = create_access_token(
            subject=user.id,
            extra_claims={"tenant_id": tenant.id, "role": user.role, "email": user.email, "token_version": user.token_version},
        )
        return {
            "tenant": tenant.model_dump(),
            "owner": user.model_dump(exclude={"password_hash"}),
            "plan": plan,
            "access_token": token,
        }

    async def authenticate(self, email: str, password: str) -> dict:
        normalized_email = email.strip().lower()
        user = sanitize_mongo_document(await self.db.users.find_one({"email": normalized_email}))
        now = datetime.now(timezone.utc)

        if user and user.get("locked_until") and user["locked_until"] > now:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Acesso temporariamente bloqueado. Tente novamente mais tarde",
            )

        if not user or not verify_password(password, user["password_hash"]):
            if user:
                await self._register_failed_attempt(user, now)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas")
        if not user.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inativo")

        await self.db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "failed_login_attempts": 0,
                    "locked_until": None,
                    "last_login_at": now,
                    "updated_at": now,
                }
            },
        )
        user["failed_login_attempts"] = 0
        user["locked_until"] = None
        user["last_login_at"] = now

        token = create_access_token(
            subject=user["id"],
            extra_claims={
                "tenant_id": user["tenant_id"],
                "role": user["role"],
                "email": user["email"],
                "token_version": user.get("token_version", 1),
            },
        )
        return {"access_token": token, "user": {key: value for key, value in user.items() if key != "password_hash"}}

    async def _register_failed_attempt(self, user: dict, now: datetime) -> None:
        attempts = int(user.get("failed_login_attempts", 0)) + 1
        update_data: dict[str, object] = {"failed_login_attempts": attempts, "updated_at": now}

        if attempts >= self.settings.login_max_attempts:
            update_data["failed_login_attempts"] = 0
            update_data["locked_until"] = now + timedelta(minutes=self.settings.login_lockout_minutes)

        await self.db.users.update_one({"id": user["id"]}, {"$set": update_data})
