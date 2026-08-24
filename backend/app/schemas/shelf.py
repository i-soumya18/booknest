from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.book import BookResponse


class ShelfRoleEnum(StrEnum):
    OWNER = "OWNER"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"


class ShelfCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Shelf name cannot be empty or whitespace only")
        return stripped


class ShelfUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Shelf name cannot be empty or whitespace only")
        return stripped


class ShelfResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    user_role: ShelfRoleEnum = ShelfRoleEnum.OWNER


class ShelfDetailResponse(ShelfResponse):
    books: list[BookResponse] = Field(default_factory=list)


class CollaboratorCreateRequest(BaseModel):
    email: EmailStr
    role: ShelfRoleEnum = Field(default=ShelfRoleEnum.VIEWER)


class CollaboratorUpdateRequest(BaseModel):
    role: ShelfRoleEnum


class CollaboratorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    email: str
    name: str
    role: ShelfRoleEnum
    created_at: datetime
