import uuid
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session
from app.models.user import User
from app.schemas.reader_note import (
    NoteAttachmentResponse,
    ReaderNoteCreate,
    ReaderNoteResponse,
    ReaderNoteUpdate,
)
from app.services.reader_note_service import ReaderNoteService

router = APIRouter()


@router.get(
    "/books/{book_id}/notes",
    response_model=list[ReaderNoteResponse],
    status_code=status.HTTP_200_OK,
)
async def list_notes(
    book_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[ReaderNoteResponse]:
    service = ReaderNoteService(session)
    notes = await service.list_notes(book_id, user.id)
    return [ReaderNoteResponse.model_validate(n) for n in notes]


@router.post(
    "/books/{book_id}/notes",
    response_model=ReaderNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_note(
    book_id: uuid.UUID,
    payload: ReaderNoteCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ReaderNoteResponse:
    service = ReaderNoteService(session)
    note = await service.create_note(book_id, user.id, payload)
    return ReaderNoteResponse.model_validate(note)


@router.patch(
    "/books/{book_id}/notes/{note_id}",
    response_model=ReaderNoteResponse,
    status_code=status.HTTP_200_OK,
)
async def update_note(
    book_id: uuid.UUID,
    note_id: uuid.UUID,
    payload: ReaderNoteUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ReaderNoteResponse:
    service = ReaderNoteService(session)
    note = await service.update_note(note_id, user.id, payload)
    return ReaderNoteResponse.model_validate(note)


@router.delete(
    "/books/{book_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_note(
    book_id: uuid.UUID,
    note_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = ReaderNoteService(session)
    await service.delete_note(note_id, user.id)


@router.post(
    "/books/{book_id}/notes/{note_id}/attachments",
    response_model=NoteAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_attachment(
    book_id: uuid.UUID,
    note_id: uuid.UUID,
    file: UploadFile = File(...),
    duration_seconds: int | None = Form(None),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> NoteAttachmentResponse:
    service = ReaderNoteService(session)
    attachment = await service.add_attachment(note_id, user.id, file, duration_seconds)
    return NoteAttachmentResponse.model_validate(attachment)


@router.get(
    "/books/{book_id}/notes/{note_id}/attachments/{attachment_id}",
    status_code=status.HTTP_200_OK,
)
async def get_attachment(
    book_id: uuid.UUID,
    note_id: uuid.UUID,
    attachment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> FileResponse:
    service = ReaderNoteService(session)
    file_path, attachment = await service.get_attachment_file(note_id, attachment_id, user.id)
    return FileResponse(
        path=str(file_path),
        media_type=attachment.mime_type,
        filename=attachment.original_name,
    )


@router.delete(
    "/books/{book_id}/notes/{note_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_attachment(
    book_id: uuid.UUID,
    note_id: uuid.UUID,
    attachment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = ReaderNoteService(session)
    await service.delete_attachment(note_id, attachment_id, user.id)
