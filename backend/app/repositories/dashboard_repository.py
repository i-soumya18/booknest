from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityEvent
from app.models.book import Book
from app.models.lending import Lending
from app.models.shelf import Shelf, ShelfBook, ShelfCollaborator
from app.schemas.book import BookStatusEnum


class DashboardRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_books_by_status(self, user_id: UUID) -> dict[str, int]:
        stmt = (
            select(Book.status, func.count(Book.id))
            .where(Book.owner_id == user_id)
            .group_by(Book.status)
        )
        res = await self.session.execute(stmt)
        result_map = {
            st.value if hasattr(st, "value") else str(st): count for st, count in res.all()
        }
        # Ensure all standard statuses exist in dictionary
        for status in BookStatusEnum:
            if status.value not in result_map:
                result_map[status.value] = 0
        return result_map

    async def get_books_finished_this_year(self, user_id: UUID) -> int:
        now = datetime.now(UTC)
        year_start = datetime(now.year, 1, 1, tzinfo=UTC)
        stmt = select(func.count(Book.id)).where(
            Book.owner_id == user_id,
            Book.status == BookStatusEnum.FINISHED,
            Book.updated_at >= year_start,
        )
        res = await self.session.execute(stmt)
        return res.scalar() or 0

    async def get_average_rating(self, user_id: UUID) -> float | None:
        stmt = select(func.avg(Book.rating)).where(
            Book.owner_id == user_id,
            Book.rating.isnot(None),
        )
        res = await self.session.execute(stmt)
        val = res.scalar()
        return round(float(val), 2) if val is not None else None

    async def get_shelf_with_most_books(self, user_id: UUID) -> dict[str, Any] | None:
        stmt = (
            select(Shelf.id, Shelf.name, func.count(ShelfBook.book_id).label("book_count"))
            .outerjoin(ShelfBook, Shelf.id == ShelfBook.shelf_id)
            .where(Shelf.owner_id == user_id)
            .group_by(Shelf.id, Shelf.name)
            .order_by(func.count(ShelfBook.book_id).desc(), Shelf.name.asc())
            .limit(1)
        )
        res = await self.session.execute(stmt)
        row = res.first()
        if not row:
            return None
        return {"id": row.id, "name": row.name, "book_count": row.book_count}

    async def get_books_currently_lent_out(self, user_id: UUID) -> int:
        stmt = select(func.count(Lending.id)).where(
            Lending.owner_id == user_id,
            Lending.returned_at.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar() or 0

    async def get_shelves_shared_with_user(self, user_id: UUID) -> int:
        stmt = select(func.count(ShelfCollaborator.shelf_id)).where(
            ShelfCollaborator.user_id == user_id
        )
        res = await self.session.execute(stmt)
        return res.scalar() or 0

    async def get_recent_activity(self, user_id: UUID, limit: int = 10) -> list[ActivityEvent]:
        stmt = (
            select(ActivityEvent)
            .where(ActivityEvent.user_id == user_id)
            .order_by(ActivityEvent.created_at.desc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
