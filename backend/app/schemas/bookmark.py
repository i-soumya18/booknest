from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class BookmarkCreate(BaseModel):
    page_number: int = Field(ge=1)
    label: str | None = Field(default=None, max_length=255)


class BookmarkResponse(BaseModel):
    id: UUID
    book_id: UUID
    user_id: UUID
    page_number: int
    label: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
