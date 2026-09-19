import os
from typing import List

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    PYDANTIC_V2 = True
except ImportError:
    from pydantic import BaseModel as BaseSettings
    PYDANTIC_V2 = False

class Settings(BaseSettings):
    PROJECT_NAME: str = "RESILIENCE AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Database
    ENV: str = os.getenv("ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resilience.db")
    
    # Security & Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "resilience-ai-super-secret-key-change-in-production-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Google AI / Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Cloud Config
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "resilience-ai-cloud")
    GOOGLE_CLOUD_REGION: str = os.getenv("GOOGLE_CLOUD_REGION", "asia-south1")
    
    # CORS & Networking
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    @property
    def cors_origins(self) -> List[str]:
        cors_str = os.getenv("BACKEND_CORS_ORIGINS")
        if cors_str:
            return [origin.strip() for origin in cors_str.split(",") if origin.strip()]
        origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8000",
        ]
        if self.FRONTEND_URL:
            origins.append(self.FRONTEND_URL.rstrip("/"))
        if self.ENV != "production":
            origins.append("*")
        return origins

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        return self.cors_origins

    if PYDANTIC_V2:
        model_config = SettingsConfigDict(
            case_sensitive=True,
            extra="allow",
            env_file=".env",
            env_file_encoding="utf-8"
        )
    else:
        class Config:
            case_sensitive = True
            extra = "allow"

settings = Settings()
