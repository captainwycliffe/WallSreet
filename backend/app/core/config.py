"""Application configuration via Pydantic BaseSettings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    APP_NAME: str = "MT5 Trade Monitor"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8081"]
    CORS_ALLOW_ALL: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mt5user:mt5pass@localhost:5432/mt5db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_POOL_SIZE: int = 10

    # Auth / JWT
    SECRET_KEY: str = "change-me-to-a-long-random-secret-key-min-32-chars"
    JWT_SECRET_KEY: str = "change-me-to-another-long-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # MT5 EA Auth
    EA_API_KEY_PREFIX: str = "mt5ea_"
    EA_RATE_LIMIT_PER_MINUTE: int = 120

    # Push Notifications
    EXPO_ACCESS_TOKEN: str = ""

    # Risk defaults
    DEFAULT_DAILY_RISK_LIMIT_PCT: float = 5.0
    DEFAULT_MAX_DRAWDOWN_PCT: float = 10.0
    DEFAULT_RISK_PER_TRADE_PCT: float = 1.0

    # EA Health
    EA_HEARTBEAT_TIMEOUT_SECONDS: int = 60
    EA_OFFLINE_ALERT_AFTER_SECONDS: int = 120

    # CME Gold / Databento integration
    DATABENTO_API_KEY: str = ""
    GOLD_QUOTE_INTERVAL_MINUTES: int = 5
    GOLD_COT_INTERVAL_HOURS: int = 6

    # Demo / Seed
    DEMO_MODE: bool = False
    SEED_DEMO_DATA: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
