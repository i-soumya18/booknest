import os
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note_attachment import NoteAttachment
from app.models.reader_note import ReaderNote
from app.repositories.book_repository import BookRepository
from app.repositories.reader_note_repository import ReaderNoteRepository
from app.schemas.reader_note import ReaderNoteCreate, ReaderNoteUpdate
from app.storage.backend import get_storage_backend


def detect_attachment_type(content: bytes, filename: str, content_type: str | None) -> tuple[str, str]:
    """Validates attachment format and size limits. Returns (attachment_type, mime_type)."""
    size = len(content)

    # 1. Check Images (Max 10MB)
    if content.startswith(b"\xff\xd8\xff"):
        if size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Image exceeds 10MB limit"}},
            )
        return "image", "image/jpeg"

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        if size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Image exceeds 10MB limit"}},
            )
        return "image", "image/png"

    if len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        if size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Image exceeds 10MB limit"}},
            )
        return "image", "image/webp"

    # 2. Check Audio (Max 25MB)
    if content.startswith(b"\x1a\x45\xdf\xa3"):
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Audio exceeds 25MB limit"}},
            )
        return "audio", "audio/webm"

    if content.startswith(b"ID3") or (len(content) >= 2 and content[0] == 0xFF and (content[1] & 0xE0) == 0xE0):
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Audio exceeds 25MB limit"}},
            )
        return "audio", "audio/mpeg"

    if len(content) >= 12 and content[4:8] == b"ftyp":
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Audio exceeds 25MB limit"}},
            )
        return "audio", "audio/mp4"

    if len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WAVE":
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Audio exceeds 25MB limit"}},
            )
        return "audio", "audio/wav"

    if content.startswith(b"OggS"):
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Audio exceeds 25MB limit"}},
            )
        return "audio", "audio/ogg"

    # Fallback to extension or content-type for recorded audio streams
    ext = os.path.splitext(filename)[1].lower()
    if content_type and "audio" in content_type:
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Audio exceeds 25MB limit"}},
            )
        return "audio", content_type

    if ext in [".webm", ".weba", ".mp3", ".m4a", ".mp4", ".ogg", ".wav"]:
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Audio exceeds 25MB limit"}},
            )
        return "audio", content_type or "audio/webm"

    if ext in [".jpg", ".jpeg", ".png", ".webp"]:
        if size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Image exceeds 10MB limit"}},
            )
        return "image", content_type or "image/png"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": {
                "code": "UNSUPPORTED_ATTACHMENT_TYPE",
                "message": "Unsupported file format. Supported formats: JPEG, PNG, WebP, WebM, MP4, MP3, WAV, OGG.",
            }
        },
    )


class ReaderNoteService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.note_repo = ReaderNoteRepository(session)
        self.book_repo = BookRepository(session)
        self.storage_backend = get_storage_backend()

    async def list_notes(self, book_id: uuid.UUID, user_id: uuid.UUID) -> list[ReaderNote]:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Book not found"}},
            )
        return await self.note_repo.list_by_book_and_user(book_id, user_id)

    async def create_note(
        self, book_id: uuid.UUID, user_id: uuid.UUID, payload: ReaderNoteCreate
    ) -> ReaderNote:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Book not found"}},
            )

        note = ReaderNote(
            book_id=book_id,
            user_id=user_id,
            page_number=payload.page_number,
            highlight_id=payload.highlight_id,
            content=payload.content,
        )
        created = await self.note_repo.create(note)
        await self.session.commit()
        return created

    async def update_note(
        self, note_id: uuid.UUID, user_id: uuid.UUID, payload: ReaderNoteUpdate
    ) -> ReaderNote:
        note = await self.note_repo.get_by_id_and_user(note_id, user_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Note not found"}},
            )

        if payload.page_number is not None:
            note.page_number = payload.page_number
        if payload.content is not None:
            note.content = payload.content

        updated = await self.note_repo.update(note)
        await self.session.commit()
        return updated

    async def delete_note(self, note_id: uuid.UUID, user_id: uuid.UUID) -> None:
        note = await self.note_repo.get_by_id_and_user(note_id, user_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Note not found"}},
            )

        # Delete all attachment files from storage backend
        for attachment in note.attachments:
            try:
                await self.storage_backend.delete(attachment.stored_path)
            except Exception:
                pass

        await self.note_repo.delete(note)
        await self.session.commit()

    async def add_attachment(
        self,
        note_id: uuid.UUID,
        user_id: uuid.UUID,
        file: UploadFile,
        duration_seconds: int | None = None,
    ) -> NoteAttachment:
        note = await self.note_repo.get_by_id_and_user(note_id, user_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Note not found"}},
            )

        if duration_seconds is not None and duration_seconds > 600:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "AUDIO_TOO_LONG", "message": "Audio recording cannot exceed 10 minutes (600s)"}},
            )

        file_bytes = await file.read()
        attachment_type, mime_type = detect_attachment_type(
            file_bytes, file.filename or "attachment", file.content_type
        )

        # Save to storage: notes/{user_id}/{note_id}/{filename}
        filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename or 'file')}"
        rel_path = f"notes/{user_id}/{note_id}/{filename}"
        stored_path = await self.storage_backend.save(file_bytes, rel_path)

        attachment = NoteAttachment(
            note_id=note.id,
            attachment_type=attachment_type,
            stored_path=stored_path,
            original_name=file.filename or "attachment",
            file_size_bytes=len(file_bytes),
            mime_type=mime_type,
            duration_seconds=duration_seconds,
        )
        created_att = await self.note_repo.create_attachment(attachment)
        await self.session.commit()
        return created_att

    async def get_attachment_file(
        self, note_id: uuid.UUID, attachment_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[Path, NoteAttachment]:
        note = await self.note_repo.get_by_id_and_user(note_id, user_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Note not found"}},
            )

        attachment = await self.note_repo.get_attachment(attachment_id)
        if not attachment or attachment.note_id != note.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}},
            )

        file_path = self.storage_backend.get_path(attachment.stored_path)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "FILE_NOT_FOUND", "message": "Attachment file missing from storage"}},
            )

        return file_path, attachment

    async def delete_attachment(
        self, note_id: uuid.UUID, attachment_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        note = await self.note_repo.get_by_id_and_user(note_id, user_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Note not found"}},
            )

        attachment = await self.note_repo.get_attachment(attachment_id)
        if not attachment or attachment.note_id != note.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}},
            )

        try:
            await self.storage_backend.delete(attachment.stored_path)
        except Exception:
            pass

        await self.note_repo.delete_attachment(attachment)
        await self.session.commit()
