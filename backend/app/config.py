from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./app.db",
        validation_alias="DATABASE_URL",
    )


    # Authentication & Security
    jwt_secret: str = Field(
        default="super-secret-jwt-key-replace-in-production-min-32-chars",
        validation_alias="JWT_SECRET",
    )
    jwt_access_ttl_minutes: int = Field(default=15, validation_alias="JWT_ACCESS_TTL_MINUTES")
    jwt_refresh_ttl_days: int = Field(default=30, validation_alias="JWT_REFRESH_TTL_DAYS")

    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001,http://localhost:3005,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3005",
        validation_alias="CORS_ORIGINS",
    )

    port: int = Field(default=8000, validation_alias="PORT")
    host: str = Field(default="0.0.0.0", validation_alias="HOST")

    # V2 — File Upload & Storage
    upload_dir: str = Field(default="uploads", validation_alias="UPLOAD_DIR")
    max_upload_size_mb: int = Field(default=100, validation_alias="MAX_UPLOAD_SIZE_MB")

    # V2 — Admin
    admin_email: str = Field(
        default="sahoosoumya242004@gmail.com", validation_alias="ADMIN_EMAIL"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
