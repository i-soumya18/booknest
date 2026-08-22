from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.lending import Lending


class LendingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active_lending_by_book(self, book_id: UUID) -> Lending | None:
        stmt = select(Lending).where(
            Lending.book_id == book_id,
            Lending.returned_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_borrowed_by_user(
        self, borrower_id: UUID, page: int = 1, page_size: int = 20
    ) -> tuple[list[Lending], int]:
        stmt = (
            select(Lending)
            .options(selectinload(Lending.book), selectinload(Lending.owner))
            .where(
                Lending.borrower_id == borrower_id,
                Lending.returned_at.is_(None),
            )
        )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total_count = total_result.scalar_one() or 0

        offset_val = (page - 1) * page_size
        stmt = stmt.order_by(Lending.borrowed_at.desc()).offset(offset_val).limit(page_size)

        result = await self.session.execute(stmt)
        items = list(result.scalars().all())
        return items, total_count

    async def create_lending(
        self,
        book_id: UUID,
        owner_id: UUID,
        borrower_id: UUID,
        due_at: datetime | None = None,
    ) -> Lending:
        lending = Lending(
            book_id=book_id,
            owner_id=owner_id,
            borrower_id=borrower_id,
            borrowed_at=datetime.now(UTC),
            due_at=due_at,
        )
        self.session.add(lending)
        await self.session.flush()
        return lending

    async def close_lending(self, lending: Lending) -> Lending:
        lending.returned_at = datetime.now(UTC)
        await self.session.flush()
        return lending
