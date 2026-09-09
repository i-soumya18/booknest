from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ReaderStateRead(BaseModel):
    id: UUID
    book_id: UUID
    user_id: UUID
    current_page: int
    current_position: str | None = None
    scroll_position: float | None = None
    zoom_level: float
    theme: str
    font_size: int
    focus_mode: bool
    eye_safety_mode: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReaderProgressUpdate(BaseModel):
    current_page: int | None = Field(default=None, ge=1)
    current_position: str | None = None
    scroll_position: float | None = None
    zoom_level: float | None = Field(default=None, ge=0.2, le=5.0)
    theme: str | None = Field(default=None, pattern="^(light|dark|sepia|custom)$")
    font_size: int | None = Field(default=None, ge=8, le=48)
    focus_mode: bool | None = None
    eye_safety_mode: bool | None = None
