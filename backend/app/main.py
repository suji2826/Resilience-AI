from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.core.config import settings
from app.db.session import engine, Base, SessionLocal, check_database_connection
from app.data.seed_data import seed_database

logger = logging.getLogger("resilience.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logger.error(f"Error creating database tables: {exc}")

    # In production, do not overwrite or re-seed on every instance boot unless SEED_DB=true
    should_seed = settings.ENV not in ("production", "staging") or os.getenv("SEED_DB", "").lower() in ("1", "true", "yes")
    if should_seed:
        db = SessionLocal()
        try:
            logger.info("Seeding initial demonstration data...")
            seed_database(db)
        except Exception as exc:
            logger.error(f"Error seeding database: {exc}")
        finally:
            db.close()
    yield

# Routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.phcs import router as phcs_router
from app.api.inventory import router as inventory_router
from app.api.forecast import router as forecast_router
from app.api.risk import router as risk_router
from app.api.anomalies import router as anomalies_router
from app.api.alerts import router as alerts_router
from app.api.workforce import router as workforce_router
from app.api.resources import router as resources_router
from app.api.redistribution import router as redistribution_router
from app.api.emergency import router as emergency_router
from app.api.federated import router as federated_router
from app.api.copilot import router as copilot_router
from app.api.analytics import router as analytics_router
from app.api.audit import router as audit_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Resilience AI — AI-Powered Healthcare Resource & Supply Chain Resilience Command Center",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
app.include_router(phcs_router, prefix=api_prefix)
app.include_router(inventory_router, prefix=api_prefix)
app.include_router(forecast_router, prefix=api_prefix)
app.include_router(risk_router, prefix=api_prefix)
app.include_router(anomalies_router, prefix=api_prefix)
app.include_router(alerts_router, prefix=api_prefix)
app.include_router(workforce_router, prefix=api_prefix)
app.include_router(resources_router, prefix=api_prefix)
app.include_router(redistribution_router, prefix=api_prefix)
app.include_router(emergency_router, prefix=api_prefix)
app.include_router(federated_router, prefix=api_prefix)
app.include_router(copilot_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "tagline": "Predict healthcare shortages before they become crises.",
        "status": "OPERATIONAL",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "synthetic_data_disclaimer": "Demonstration data for healthcare resilience research. Not official government clinical records."
    }

@app.get("/health")
@app.get(f"{api_prefix}/health")
def health_check(response: Response):
    db_ok = check_database_connection()
    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "service": "resilience-ai-backend",
            "database": "unreachable",
            "env": settings.ENV,
            "version": settings.VERSION
        }
    return {
        "status": "healthy",
        "service": "resilience-ai-backend",
        "database": "connected",
        "env": settings.ENV,
        "version": settings.VERSION
    }

@app.get("/health/liveness")
@app.get(f"{api_prefix}/health/liveness")
def liveness_check():
    """Lightweight ping for Cloud Run liveness probe."""
    return {"status": "alive"}
