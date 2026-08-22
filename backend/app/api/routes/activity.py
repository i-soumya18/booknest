from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.activity import ActivityEventResponse
from app.schemas.book import PaginatedResponse
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("", response_model=PaginatedResponse[ActivityEventResponse])
async def list_activity(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedResponse[ActivityEventResponse]:
    service = ActivityService(session)
    return await service.list_user_activities(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )
