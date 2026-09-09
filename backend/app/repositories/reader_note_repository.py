import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.note_attachment import NoteAttachment
from app.models.reader_note import ReaderNote


class ReaderNoteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_book_and_user(
        self, book_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[ReaderNote]:
        stmt = (
            select(ReaderNote)
            .options(selectinload(ReaderNote.attachments))
            .where(ReaderNote.book_id == book_id, ReaderNote.user_id == user_id)
            .order_by(ReaderNote.page_number.asc().nullsfirst(), ReaderNote.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(
        self, note_id: uuid.UUID, user_id: uuid.UUID
    ) -> ReaderNote | None:
        stmt = (
            select(ReaderNote)
            .options(selectinload(ReaderNote.attachments))
            .where(ReaderNote.id == note_id, ReaderNote.user_id == user_id)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, note: ReaderNote) -> ReaderNote:
        self._session.add(note)
        await self._session.flush()
        # Refresh to populate empty attachments collection
        await self._session.refresh(note, attribute_names=["attachments"])
        return note

    async def update(self, note: ReaderNote) -> ReaderNote:
        await self._session.flush()
        return note

    async def delete(self, note: ReaderNote) -> None:
        await self._session.delete(note)
        await self._session.flush()

    async def create_attachment(self, attachment: NoteAttachment) -> NoteAttachment:
        self._session.add(attachment)
        await self._session.flush()
        return attachment

    async def get_attachment(
        self, attachment_id: uuid.UUID
    ) -> NoteAttachment | None:
        stmt = (
            select(NoteAttachment)
            .options(selectinload(NoteAttachment.note))
            .where(NoteAttachment.id == attachment_id)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_attachment(self, attachment: NoteAttachment) -> None:
        await self._session.delete(attachment)
        await self._session.flush()
