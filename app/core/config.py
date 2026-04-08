from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Zap Automation API"
    app_env: Literal["development", "staging", "production"] = "development"
    api_prefix: str = "/api/v1"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "zap-automation"
    jwt_audience: str = "zap-automation-app"
    jwt_clock_skew_seconds: int = 30
    access_token_expire_minutes: int = 1440

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "zap_automation"
    mongodb_server_selection_timeout_ms: int = 5000
    frontend_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    trusted_hosts: str = "localhost,127.0.0.1"
    redis_url: str = "redis://localhost:6379/0"
    redis_stream_enabled: bool = False
    redis_stream_consumer_enabled: bool = True
    redis_stream_key: str = "zap_automation:whatsapp_events"
    redis_stream_group: str = "whatsapp_automation_workers"
    redis_stream_consumer_name: str = "api-worker"
    redis_stream_block_ms: int = 5000
    redis_stream_batch_size: int = 20
    redis_stream_maxlen: int = 10000
    redis_stream_max_attempts: int = 3
    redis_dead_letter_key: str = "zap_automation:whatsapp_events:dlq"
    provider_send_retries: int = 3
    provider_retry_backoff_ms: int = 700

    whatsapp_verify_token: str = "meta-verify-token"
    whatsapp_app_secret: str = ""
    whatsapp_api_version: str = "v21.0"
    whatsapp_graph_url: str = "https://graph.facebook.com"
    whatsapp_request_timeout_seconds: int = 20
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""
    openai_api_key: str = ""
    public_checkout_starter_url: str = ""
    public_checkout_smarter_url: str = ""
    public_contact_whatsapp: str = ""
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60
    auth_rate_limit_requests: int = 10
    auth_rate_limit_window_seconds: int = 60
    webhook_rate_limit_requests: int = 240
    webhook_rate_limit_window_seconds: int = 60
    login_max_attempts: int = 5
    login_lockout_minutes: int = 15
    max_request_body_bytes: int = 1_048_576
    webhook_max_body_bytes: int = 262_144

    default_admin_email: str = "admin@zapautomation.local"
    default_admin_password: str = "admin123"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @property
    def frontend_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        hosts = [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]
        if self.app_env == "development":
            return hosts or ["localhost", "127.0.0.1", "*.localhost"]
        return hosts


@lru_cache
def get_settings() -> Settings:
    return Settings()
