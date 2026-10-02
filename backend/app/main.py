import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import get_settings
from app.database import Base, get_engine
from app.routers import auth, companion, demo, medications, profile, summaries, support, taper, tracking
from app.seed import seed

SPA_DIST = Path(__file__).resolve().parent.parent / "static" / "dist"


def _mount_spa(app: FastAPI) -> None:
    index = SPA_DIST / "index.html"
    if not index.is_file():
        return
    dist_root = SPA_DIST.resolve()

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        requested = (SPA_DIST / full_path).resolve()
        try:
            requested.relative_to(dist_root)
        except ValueError:
            raise HTTPException(status_code=404)
        if requested.is_file():
            return FileResponse(requested)
        return FileResponse(index)


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
    render_origin = os.environ.get("RENDER_EXTERNAL_URL", "").strip().rstrip("/")
    if render_origin and render_origin not in origins:
        origins.append(render_origin)
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
    app.include_router(companion.router, prefix="/api")
    app.include_router(demo.router, prefix="/api")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    _mount_spa(app)
    return app


app = create_app()
