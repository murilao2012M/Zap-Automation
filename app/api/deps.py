from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.db.mongo import get_database
from app.utils.serialization import sanitize_mongo_document

security = HTTPBearer(auto_error=False)


def get_db():
    return get_database()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)):
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de autenticacao ausente")

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user = sanitize_mongo_document(await db.users.find_one({"id": payload["sub"]}))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado")
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inativo")
    if payload.get("tenant_id") and payload["tenant_id"] != user.get("tenant_id"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido para este tenant")
    if payload.get("role") and payload["role"] != user.get("role"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido para este usuario")
    if payload.get("email") and payload["email"] != user.get("email"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido para este usuario")
    if payload.get("token_version") != user.get("token_version", 1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao expirada. Faca login novamente")
    return user


def assert_tenant_access(current_user: dict, tenant_id: str, allowed_roles: set[str] | None = None) -> None:
    if current_user.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado para este tenant",
        )

    if allowed_roles and current_user.get("role") not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissao insuficiente para executar esta acao",
        )
