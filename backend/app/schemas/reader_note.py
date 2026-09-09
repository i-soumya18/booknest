import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class NoteAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    note_id: uuid.UUID
    attachment_type: str
    original_name: str
    file_size_bytes: int
    mime_type: str
    duration_seconds: int | None = None
    created_at: datetime


class ReaderNoteCreate(BaseModel):
    page_number: int | None = None
    highlight_id: uuid.UUID | None = None
    content: str = Field(default="", max_length=50000)


class ReaderNoteUpdate(BaseModel):
    page_number: int | None = None
    content: str | None = Field(default=None, max_length=50000)


class ReaderNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    book_id: uuid.UUID
    user_id: uuid.UUID
    page_number: int | None = None
    highlight_id: uuid.UUID | None = None
    content: str
    created_at: datetime
    updated_at: datetime
    attachments: list[NoteAttachmentResponse] = []
