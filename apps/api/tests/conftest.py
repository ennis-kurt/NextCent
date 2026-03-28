from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import User
from app.seed_data import ensure_seed_data
from app.services.finance import persist_pipeline


@pytest.fixture(scope="session", autouse=True)
def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_seed_data(db)
        for user in db.query(User).all():
            persist_pipeline(db, user.persona_key)
    finally:
        db.close()


@pytest.fixture()
def client(seed_database):
    with TestClient(app) as test_client:
        yield test_client
