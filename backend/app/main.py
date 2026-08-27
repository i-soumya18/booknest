from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models.activity  # noqa: F401
import app.models.book  # noqa: F401
import app.models.lending  # noqa: F401
import app.models.shelf  # noqa: F401
import app.models.token  # noqa: F401
import app.models.user  # noqa: F401
import app.ws.router  # noqa: F401 - registers WebSocket event router handler
from app.api.router import api_router
from app.config import get_settings
from app.db.session import engine
from app.models.base import Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="BookNest API",
    description="Production-minded reading tracker backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def root_health_check() -> dict[str, str]:
    return {"status": "ok", "service": "booknest-backend"}
