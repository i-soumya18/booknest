from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityEvent


class ActivityRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_activities(
        self, user_id: UUID, page: int = 1, page_size: int = 20
    ) -> tuple[list[ActivityEvent], int]:
        stmt = select(ActivityEvent).where(ActivityEvent.user_id == user_id)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total_count = total_result.scalar_one() or 0

        offset_val = (page - 1) * page_size
        stmt = (
            stmt.order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
            .offset(offset_val)
            .limit(page_size)
        )

        result = await self.session.execute(stmt)
        items = list(result.scalars().all())
        return items, total_count
