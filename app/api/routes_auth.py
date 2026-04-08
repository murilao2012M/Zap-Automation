from fastapi import APIRouter, Depends, status

from app.api.deps import assert_tenant_access, get_current_user, get_db
from app.schemas.auth import LoginRequest, RegisterTenantRequest, RegisterUserRequest, SignupResponseData, TokenResponse
from app.schemas.common import APIResponse
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db=Depends(get_db)):
    auth_service = AuthService(db)
    result = await auth_service.authenticate(payload.email, payload.password)
    await AuditService(db).record(
        tenant_id=result["user"].get("tenant_id"),
        actor_id=result["user"].get("id"),
        actor_email=result["user"].get("email"),
        action="auth.login",
        resource_type="user",
        resource_id=result["user"].get("id"),
        detail="Usuario autenticado com sucesso",
    )
    return TokenResponse(access_token=result["access_token"], user=result["user"])


@router.post("/signup", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: RegisterTenantRequest, db=Depends(get_db)):
    auth_service = AuthService(db)
    result = await auth_service.register_tenant(payload)
    await AuditService(db).record(
        tenant_id=result["tenant"].get("id"),
        actor_id=result["owner"].get("id"),
        actor_email=result["owner"].get("email"),
        action="auth.signup",
        resource_type="tenant",
        resource_id=result["tenant"].get("id"),
        detail="Empresa criada e owner provisionado",
        metadata={"plan_name": result["tenant"].get("plan_name")},
    )
    return APIResponse(message="Empresa cadastrada com sucesso", data=SignupResponseData(**result).model_dump())


@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterUserRequest, db=Depends(get_db), current_user=Depends(get_current_user)):
    assert_tenant_access(current_user, payload.tenant_id, allowed_roles={"owner", "admin"})
    auth_service = AuthService(db)
    user = await auth_service.register_user(payload)
    await AuditService(db).record(
        tenant_id=payload.tenant_id,
        actor_id=current_user.get("id"),
        actor_email=current_user.get("email"),
        action="auth.user_registered",
        resource_type="user",
        resource_id=user.id,
        detail="Novo usuario cadastrado no tenant",
        metadata={"role": user.role, "email": user.email},
    )
    return APIResponse(message="Usuario criado com sucesso", data=user.model_dump(exclude={"password_hash"}))
