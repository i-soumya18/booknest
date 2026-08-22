from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.book import BookResponse


class LendBookRequest(BaseModel):
    borrower_email: EmailStr | None = None
    borrower_id: UUID | None = None
    due_at: datetime | None = None


class LendingResponse(BaseModel):
    id: UUID
    book_id: UUID
    owner_id: UUID
    borrower_id: UUID
    borrowed_at: datetime
    due_at: datetime | None = None
    returned_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class BorrowedBookResponse(BaseModel):
    lending_id: UUID
    book: BookResponse
    owner_id: UUID
    owner_name: str
    owner_email: str
    borrowed_at: datetime
    due_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
