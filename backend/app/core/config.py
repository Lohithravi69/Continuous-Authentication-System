from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Continuous Keystroke Dynamics Authentication"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fyp-continuous-auth-secret-key-super-secure-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Database: Async SQLite for local dev / PostgreSQL compatible
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite+aiosqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'fyp_auth.db')}"
    )
    
    # ML & Storage
    MODELS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models_store")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    # Risk Engine Configs
    MIN_KEYSTROKES_GATE: int = 15
    WINDOW_DURATION_SEC: int = 5
    GREEN_THRESHOLD: float = 0.40
    YELLOW_THRESHOLD: float = 0.70
    MAX_STRIKES_BEFORE_STEPUP: int = 2
    STRIKE_DECAY_CLEAN_SEC: int = 30
    MAX_STEPUP_FAILURES_BEFORE_LOCK: int = 3

    class Config:
        case_sensitive = True

settings = Settings()
os.makedirs(settings.MODELS_DIR, exist_ok=True)
