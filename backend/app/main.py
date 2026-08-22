from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="BookNest API",
    description="Production-minded reading tracker backend",
    version="0.1.0",
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
