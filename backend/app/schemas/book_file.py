from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BookFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    book_id: UUID
    original_name: str
    stored_path: str
    mime_type: str
    file_size_bytes: int
    page_count: int | None = None
    cover_thumbnail: str | None = None
    checksum_sha256: str | None = None
    created_at: datetime
