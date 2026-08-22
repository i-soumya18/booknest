from datetime import datetime
from enum import StrEnum
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookStatusEnum(StrEnum):
    WANT_TO_READ = "WANT_TO_READ"
    READING = "READING"
    FINISHED = "FINISHED"


class BookSortByEnum(StrEnum):
    CREATED_AT = "created_at"
    TITLE = "title"
    RATING = "rating"


class SortOrderEnum(StrEnum):
    ASC = "asc"
    DESC = "desc"


class BookCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    status: BookStatusEnum = Field(default=BookStatusEnum.WANT_TO_READ)
    total_pages: int = Field(..., ge=1)
    current_page: int = Field(default=0, ge=0)
    rating: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = Field(default=None)

    @field_validator("current_page")
    @classmethod
    def validate_current_page(cls, current_page: int, info) -> int:
        total_pages = info.data.get("total_pages")
        if total_pages is not None and current_page > total_pages:
            raise ValueError("current_page cannot exceed total_pages")
        return current_page


class BookUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    author: str | None = Field(default=None, min_length=1, max_length=255)
    status: BookStatusEnum | None = Field(default=None)
    total_pages: int | None = Field(default=None, ge=1)
    current_page: int | None = Field(default=None, ge=0)
    rating: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = Field(default=None)


class BookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    title: str
    author: str
    status: BookStatusEnum
    total_pages: int
    current_page: int
    rating: int | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None = None


class ProgressUpdateRequest(BaseModel):
    current_page: int = Field(..., ge=0)


class ProgressUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    current_page: int
    total_pages: int
    progress_percentage: int
    status: BookStatusEnum
    finished_at: datetime | None = None


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int
