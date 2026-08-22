from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Health check endpoint to verify backend server status."""
    return {"status": "ok", "service": "booknest-backend"}
