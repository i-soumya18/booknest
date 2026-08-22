from fastapi import APIRouter

from app.api.routes import activity, auth, books, dashboard, lending, shelves, ws

api_router = APIRouter()

# Include Sub-Routers
api_router.include_router(auth.router)
api_router.include_router(books.router)
api_router.include_router(shelves.router)
api_router.include_router(lending.router)
api_router.include_router(activity.router)
api_router.include_router(dashboard.router)
api_router.include_router(ws.router)


@api_router.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Health check endpoint to verify backend server status."""
    return {"status": "ok", "service": "booknest-backend"}
