import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bookmark import Bookmark


class BookmarkRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_by_book_and_user(
        self, book_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[Bookmark]:
        stmt = (
            select(Bookmark)
            .where(Bookmark.book_id == book_id, Bookmark.user_id == user_id)
            .order_by(Bookmark.page_number.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_book_user_page(
        self, book_id: uuid.UUID, user_id: uuid.UUID, page_number: int
    ) -> Bookmark | None:
        stmt = select(Bookmark).where(
            Bookmark.book_id == book_id,
            Bookmark.user_id == user_id,
            Bookmark.page_number == page_number,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, bookmark_id: uuid.UUID) -> Bookmark | None:
        stmt = select(Bookmark).where(Bookmark.id == bookmark_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, bookmark: Bookmark) -> Bookmark:
        self.session.add(bookmark)
        await self.session.flush()
        return bookmark

    async def delete(self, bookmark: Bookmark) -> None:
        await self.session.delete(bookmark)
        await self.session.flush()
