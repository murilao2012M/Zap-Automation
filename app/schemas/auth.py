from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def validate_strong_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("A senha deve conter pelo menos 8 caracteres")
    if not any(char.isupper() for char in value):
        raise ValueError("A senha deve conter ao menos 1 letra maiúscula")
    if not any(char.islower() for char in value):
        raise ValueError("A senha deve conter ao menos 1 letra minúscula")
    if not any(char.isdigit() for char in value):
        raise ValueError("A senha deve conter ao menos 1 número")
    return value


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6)

    @field_validator("email")
    @classmethod
    def normalize_login_email(cls, value: str) -> str:
        return value.strip().lower()


class RegisterUserRequest(BaseModel):
    tenant_id: str
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = "admin"

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_strong_password(value)


class RegisterTenantRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=120)
    owner_name: str = Field(min_length=2, max_length=120)
    owner_email: EmailStr
    owner_password: str = Field(min_length=8)
    whatsapp_number: str | None = None
    plan_name: Literal["starter", "smarter"] = "starter"

    @field_validator("company_name", "owner_name")
    @classmethod
    def normalize_text_fields(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("owner_email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("owner_password")
    @classmethod
    def validate_owner_password(cls, value: str) -> str:
        return validate_strong_password(value)

    @field_validator("whatsapp_number")
    @classmethod
    def normalize_whatsapp_number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = "".join(char for char in value if char.isdigit())
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("whatsapp_number deve conter entre 10 e 15 digitos")
        return digits


class SignupResponseData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tenant: dict
    owner: dict
    plan: dict
    access_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
