from __future__ import annotations

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

logger = logging.getLogger("zap_automation")


class CredentialVaultService:
    def __init__(self) -> None:
        settings = get_settings()
        seed_value = settings.credentials_encryption_key or settings.jwt_secret_key
        digest = hashlib.sha256(seed_value.encode("utf-8")).digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(digest))

    def encrypt(self, value: str | None) -> str | None:
        if not value:
            return None
        return self._fernet.encrypt(value.encode("utf-8")).decode("utf-8")

    def decrypt(self, value: str | None) -> str | None:
        if not value:
            return None
        try:
            return self._fernet.decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            logger.warning("credential_decrypt_failed invalid_token=true")
            return None

    def read_secret(
        self,
        tenant: dict,
        *,
        plain_field: str,
        encrypted_field: str,
    ) -> str | None:
        encrypted_value = tenant.get(encrypted_field)
        if encrypted_value:
            decrypted = self.decrypt(str(encrypted_value))
            if decrypted:
                return decrypted
        plain_value = tenant.get(plain_field)
        return str(plain_value) if plain_value else None

    @staticmethod
    def build_hint(value: str | None) -> str | None:
        if not value:
            return None
        if len(value) <= 6:
            return "*" * len(value)
        return f"{value[:6]}...{value[-4:]}"

    @staticmethod
    def detect_storage_mode(tenant: dict, *, encrypted_field: str, plain_field: str) -> str:
        if tenant.get(encrypted_field):
            return "encrypted_at_rest"
        if tenant.get(plain_field):
            return "legacy_plaintext"
        return "none"
