from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AnnotationCreate(BaseModel):
    content: str = Field(min_length=1)


class AnnotationUpdate(BaseModel):
    content: str = Field(min_length=1)


class AnnotationResponse(BaseModel):
    id: UUID
    highlight_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HighlightCreate(BaseModel):
    page_number: int = Field(default=1, ge=1)
    cfi_range: str | None = None
    start_offset: int = Field(default=0, ge=0)
    end_offset: int = Field(default=0, ge=0)
    selected_text: str = Field(min_length=1)
    color: str = Field(default="yellow", pattern="^(yellow|green|blue|pink|purple)$")


class HighlightUpdate(BaseModel):
    color: str | None = Field(default=None, pattern="^(yellow|green|blue|pink|purple)$")


class HighlightResponse(BaseModel):
    id: UUID
    book_id: UUID
    user_id: UUID
    page_number: int
    cfi_range: str | None = None
    start_offset: int
    end_offset: int
    selected_text: str
    color: str
    created_at: datetime
    updated_at: datetime
    annotations: list[AnnotationResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
