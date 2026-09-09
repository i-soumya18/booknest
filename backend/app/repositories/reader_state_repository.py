import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reader_state import ReaderState


class ReaderStateRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_book_and_user(
        self, book_id: uuid.UUID, user_id: uuid.UUID
    ) -> ReaderState | None:
        stmt = select(ReaderState).where(
            ReaderState.book_id == book_id,
            ReaderState.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, reader_state: ReaderState) -> ReaderState:
        self.session.add(reader_state)
        await self.session.flush()
        return reader_state
