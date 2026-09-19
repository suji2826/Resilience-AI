"""
RESILIENCE AI — Database Initialization Module
===============================================
Creates all tables and (if requested) runs the seed loader.
Designed to be called:
  - At application startup (lifespan hook in main.py)
  - Standalone via the CLI:  python -m app.db.init_db [--seed] [--reset]
"""
import argparse
import sys
import logging

from sqlalchemy import inspect, text

from app.db.session import engine, Base, SessionLocal, check_database_connection

# Import ALL entity models so their metadata is registered on Base
# before create_all() is called.
import app.models.entities  # noqa: F401

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core initialisation routines
# ---------------------------------------------------------------------------

def create_tables(drop_first: bool = False) -> None:
    """
    Create all database tables from the SQLAlchemy metadata.

    Args:
        drop_first: If True, drop all existing tables before recreating.
                    WARNING: destroys all data. Only use in dev/test.
    """
    if drop_first:
        logger.warning("[DB] DROP_FIRST=True — dropping all tables before recreating.")
        Base.metadata.drop_all(bind=engine)
        logger.info("[DB] All tables dropped.")

    Base.metadata.create_all(bind=engine)
    logger.info("[DB] Schema created / verified successfully.")


def get_existing_tables() -> list[str]:
    """Return names of all tables currently in the database."""
    inspector = inspect(engine)
    return inspector.get_table_names()


def print_schema_summary() -> None:
    """Log a human-readable summary of the current schema."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\n{'='*60}")
    print(f"  DATABASE SCHEMA -- {len(tables)} tables")
    print(f"{'='*60}")
    for table in sorted(tables):
        cols = inspector.get_columns(table)
        pks  = inspector.get_pk_constraint(table).get("constrained_columns", [])
        fks  = inspector.get_foreign_keys(table)
        idxs = inspector.get_indexes(table)
        print(f"\n  [{table}]  ({len(cols)} columns, {len(fks)} FKs, {len(idxs)} indexes)")
        for col in cols:
            pk_marker = "PK" if col["name"] in pks else "  "
            nullable  = "" if col["nullable"] else " NOT NULL"
            print(f"    {pk_marker}  {col['name']:<35} {str(col['type']):<25}{nullable}")


def run_seed(force: bool = False) -> None:
    """
    Seed the database with synthetic demonstration data.

    Args:
        force: If True, drop and re-seed even if data already exists.
    """
    # Late import to avoid circular dependency during module loading
    from app.data.seed_data import seed_database

    db = SessionLocal()
    try:
        if force:
            # Truncate everything before re-seeding
            _truncate_all_tables(db)

        seed_database(db)
    except Exception as exc:
        db.rollback()
        logger.exception(f"[DB] Seed failed: {exc}")
        raise
    finally:
        db.close()


def _truncate_all_tables(db) -> None:
    """
    Delete all rows from all tables in dependency-safe order.
    Uses TRUNCATE on PostgreSQL or DELETE on SQLite.
    """
    is_sqlite = "sqlite" in str(engine.url)
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    # Disable FK constraints during truncation (SQLite only)
    if is_sqlite:
        db.execute(text("PRAGMA foreign_keys=OFF"))

    # Reverse topological order — delete child tables before parents
    truncate_order = [
        "audit_logs",
        "federated_training_rounds",
        "model_metrics",
        "redistribution_transactions",
        "redistribution_recommendations",
        "emergency_events",
        "risk_scores",
        "forecasts",
        "alerts",
        "staff_attendance",
        "staff",
        "beds",
        "medicine_consumption",
        "patient_footfall",
        "inventory_transactions",
        "inventory",
        "federated_nodes",
        "phcs",
        "medicines",
        "suppliers",
        "users",
        "districts",
        "states",
        "countries",
        "roles",
    ]

    for tbl in truncate_order:
        if tbl in tables:
            if is_sqlite:
                db.execute(text(f"DELETE FROM {tbl}"))
            else:
                db.execute(text(f"TRUNCATE TABLE {tbl} CASCADE"))

    if is_sqlite:
        db.execute(text("PRAGMA foreign_keys=ON"))

    db.commit()
    logger.info("[DB] All tables truncated.")


# ---------------------------------------------------------------------------
# Standalone CLI entry-point
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="RESILIENCE AI -- Database Initialization CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create tables and seed (safe -- skips if already populated)
  python -m app.db.init_db --seed

  # Fresh reset: drop everything, recreate schema, reseed
  python -m app.db.init_db --reset --seed

  # Only print schema summary (no changes)
  python -m app.db.init_db --schema
        """
    )
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Populate the database with synthetic demo data after creating tables.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop ALL existing tables before recreating. Destroys all data!",
    )
    parser.add_argument(
        "--schema",
        action="store_true",
        help="Print a human-readable schema summary and exit.",
    )
    parser.add_argument(
        "--force-seed",
        action="store_true",
        help="Truncate all rows and re-run the seed even if data already exists.",
    )
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    args = _parse_args()

    print("\n" + "="*60)
    print("  RESILIENCE AI -- Database Layer Initialization")
    print("="*60)

    # 1. Connectivity check
    print("\n[1/4] Checking database connectivity...")
    if not check_database_connection():
        print("[FATAL] Cannot reach the database. Check DATABASE_URL and server status.")
        sys.exit(1)
    print("       [OK] Database reachable.")

    # 2. Schema-only mode
    if args.schema:
        print_schema_summary()
        sys.exit(0)

    # 3. Create (or drop+create) tables
    print("\n[2/4] Creating database schema...")
    create_tables(drop_first=args.reset)
    print("       [OK] Schema ready.")

    # 4. Optionally seed
    if args.seed or args.force_seed:
        print("\n[3/4] Running database seed...")
        run_seed(force=args.force_seed)
        print("       [OK] Database seeded.")
    else:
        print("\n[3/4] Skipping seed (pass --seed to populate demo data).")

    # 5. Summary
    print("\n[4/4] Schema summary:")
    print_schema_summary()

    print("\n" + "="*60)
    print("  Initialization complete.")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
