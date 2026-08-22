import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityEventResponse
from app.schemas.book import PaginatedResponse


class ActivityService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.activity_repo = ActivityRepository(session)

    async def list_user_activities(
        self, user_id: UUID, page: int = 1, page_size: int = 20
    ) -> PaginatedResponse[ActivityEventResponse]:
        items, total = await self.activity_repo.get_user_activities(
            user_id=user_id, page=page, page_size=page_size
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 0
        event_responses = [ActivityEventResponse.model_validate(e) for e in items]

        return PaginatedResponse[ActivityEventResponse](
            items=event_responses,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )
