from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.session import init_db
from app.api import auth, enrollment, telemetry, session, evaluation, audit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("continuous_auth")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Continuous Keystroke Auth database schema...")
    await init_db()
    logger.info("System ready. One-Class SVM models directory: %s", settings.MODELS_DIR)
    yield
    logger.info("Shutting down Continuous Keystroke Auth API.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Privacy-Preserving Risk-Based Continuous User Authentication Using Keystroke Dynamics API",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Open for local multi-port dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(enrollment.router, prefix=settings.API_V1_STR)
app.include_router(telemetry.router, prefix=settings.API_V1_STR)
app.include_router(session.router, prefix=settings.API_V1_STR)
app.include_router(evaluation.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs_url": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    return {
        "status": "HEALTHY",
        "models_dir": settings.MODELS_DIR,
        "database": "CONNECTED"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
