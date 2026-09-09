import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ReaderState(Base):
    """
    Per-user, per-book reading state.
    Preserves reading progress, position, zoom, theme, and reader preferences.
    """
    __tablename__ = "reader_states"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    current_page: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    current_position: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )
    scroll_position: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    zoom_level: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
    )
    theme: Mapped[str] = mapped_column(
        String(32),
        default="light",
        nullable=False,
    )
    font_size: Mapped[int] = mapped_column(
        Integer,
        default=16,
        nullable=False,
    )
    focus_mode: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    eye_safety_mode: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    book = relationship("Book", back_populates="reader_states")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("book_id", "user_id", name="uq_reader_states_book_user"),
        Index("ix_reader_states_user_book", "user_id", "book_id"),
    )
