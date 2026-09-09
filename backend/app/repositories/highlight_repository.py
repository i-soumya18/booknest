import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.annotation import Annotation
from app.models.highlight import Highlight


class HighlightRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_by_book_and_user(
        self, book_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[Highlight]:
        stmt = (
            select(Highlight)
            .options(selectinload(Highlight.annotations))
            .where(Highlight.book_id == book_id, Highlight.user_id == user_id)
            .order_by(Highlight.page_number.asc(), Highlight.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, highlight_id: uuid.UUID) -> Highlight | None:
        stmt = (
            select(Highlight)
            .options(selectinload(Highlight.annotations))
            .where(Highlight.id == highlight_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, highlight: Highlight) -> Highlight:
        self.session.add(highlight)
        await self.session.flush()
        return highlight

    async def delete(self, highlight: Highlight) -> None:
        await self.session.delete(highlight)
        await self.session.flush()


class AnnotationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, annotation_id: uuid.UUID) -> Annotation | None:
        stmt = select(Annotation).where(Annotation.id == annotation_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, annotation: Annotation) -> Annotation:
        self.session.add(annotation)
        await self.session.flush()
        return annotation

    async def delete(self, annotation: Annotation) -> None:
        await self.session.delete(annotation)
        await self.session.flush()
