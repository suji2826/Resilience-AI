"""
RESILIENCE AI — Database Session & Engine Configuration
=======================================================
Supports both SQLite (zero-config dev) and PostgreSQL (Cloud SQL production).

SQLite:  DATABASE_URL=sqlite:///./resilience.db          (default)
Postgres: DATABASE_URL=postgresql://user:pass@host/dbname (production)
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool, QueuePool

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine factory: different pool strategy for SQLite vs PostgreSQL
# ---------------------------------------------------------------------------

def _create_sqlite_engine(url: str):
    """
    SQLite engine with a StaticPool so every thread reuses the same
    in-memory-compatible connection. check_same_thread=False is required
    for FastAPI's async threading model.
    """
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Enable WAL mode and foreign-key enforcement for SQLite
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

    return engine


def _create_postgres_engine(url: str):
    """
    PostgreSQL engine with connection pooling appropriate for Cloud Run
    (stateless, horizontally scaled instances).
    """
    return create_engine(
        url,
        poolclass=QueuePool,
        pool_size=5,           # Connections kept open per instance
        max_overflow=10,       # Extra connections allowed under burst
        pool_timeout=30,       # Seconds to wait for a free connection
        pool_recycle=1800,     # Recycle connections every 30 min (Cloud SQL idle timeout)
        pool_pre_ping=True,    # Detect stale connections before use
        echo=False,
    )


# Select engine based on DATABASE_URL scheme
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = (
    _create_sqlite_engine(settings.DATABASE_URL)
    if _is_sqlite
    else _create_postgres_engine(settings.DATABASE_URL)
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,   # Prevent lazy-load errors after commit in async context
)

# ---------------------------------------------------------------------------
# Declarative base — shared by all models
# ---------------------------------------------------------------------------

Base = declarative_base()

# ---------------------------------------------------------------------------
# FastAPI dependency — yields a DB session per request
# ---------------------------------------------------------------------------

def get_db():
    """
    FastAPI dependency that provides a database session.

    Usage in a router:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Utility: verify live database connectivity
# ---------------------------------------------------------------------------

def check_database_connection() -> bool:
    """
    Returns True if the database is reachable and responding.
    Used by the /health endpoint and during startup.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        print(f"[DB] Connection check failed: {exc}")
        return False
