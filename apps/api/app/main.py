from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User
from .routers.api import router
from .seed_data import ensure_seed_data
from .services.finance import persist_pipeline


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_seed_data(db)
        personas = [user.persona_key for user in db.query(User).all()]
        for persona_id in personas:
            persist_pipeline(db, persona_id)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Privacy-first seeded MVP for Personal Accountant AI.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )
    app.include_router(router, prefix=settings.api_prefix)

    @app.get("/health")
    def healthcheck():
        return {"status": "ok", "service": settings.app_name}

    return app


app = create_app()
