import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class AdminAnalyticsResponse(BaseModel):
    total_users: int
    total_books_with_file: int
    total_books_without_file: int
    total_storage_used_bytes: int
    active_readers_7d: int
    active_lendings: int
    total_shelves: int
    new_users_this_month: int


class AdminUserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    is_active: bool
    created_at: datetime
    books_count: int = 0
    shelves_count: int = 0
    storage_used_bytes: int = 0


class AdminUserDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    books_count: int = 0
    shelves_count: int = 0
    storage_used_bytes: int = 0
    recent_activity: list[dict[str, Any]] = []


class AdminUserUpdate(BaseModel):
    is_active: bool


class AdminResetPasswordRequest(BaseModel):
    new_password: str | None = Field(default=None, min_length=8)


class AdminResetPasswordResponse(BaseModel):
    message: str
    temporary_password: str


class AdminSettingItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: Any
    updated_at: datetime
    updated_by: uuid.UUID | None = None


class AdminSettingUpdate(BaseModel):
    key: str
    value: Any


class AdminAuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    admin_id: uuid.UUID
    admin_email: str | None = None
    action: str
    target_user_id: uuid.UUID | None = None
    target_file_id: uuid.UUID | None = None
    details: dict[str, Any]
    ip_address: str | None = None
    created_at: datetime


class AdminFileItem(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    book_title: str
    original_name: str
    file_size_bytes: int
    mime_type: str
    page_count: int | None = None
    created_at: datetime
    uploader_email: str | None = None
