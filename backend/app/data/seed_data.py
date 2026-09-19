"""
RESILIENCE AI — Database Seeder Entrypoint
===========================================
Delegates to the deterministic SyntheticDataGenerator.
Ensures zero-duplicate execution and consistent test fixture setup.
"""
from sqlalchemy.orm import Session
from app.data.generator import SyntheticDataGenerator
from app.models.entities import Country

def seed_database(db: Session, seed: int = 42, days: int = 90, force: bool = False):
    """
    Seed the database with deterministic synthetic demonstration data.
    If data already exists and force is False, skips generation to prevent duplicates.
    """
    if not force and db.query(Country).first():
        print("[SEED] Database already populated. Skipping seed.")
        return

    generator = SyntheticDataGenerator(seed=seed, history_days=days)
    generator.generate_all(db, verbose=True)


if __name__ == "__main__":
    from app.db.session import SessionLocal, engine, Base
    from app.db.init_db import create_tables

    create_tables(drop_first=False)
    db = SessionLocal()
    try:
        seed_database(db, force=True)
    finally:
        db.close()
