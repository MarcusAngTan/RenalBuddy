from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, get_engine
from app.routers import auth, demo, medications, profile, summaries, support, taper, tracking
from app.seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    del app
    settings = get_settings()
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=get_engine())
    seed()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="RenalBuddy", lifespan=lifespan)
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router, prefix="/api")
    app.include_router(profile.router, prefix="/api")
    app.include_router(medications.router, prefix="/api")
    app.include_router(taper.router, prefix="/api")
    app.include_router(tracking.router, prefix="/api")
    app.include_router(support.router, prefix="/api")
    app.include_router(summaries.router, prefix="/api")
    app.include_router(demo.router, prefix="/api")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
