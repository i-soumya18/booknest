import uuid
from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Highlight(Base):
    __tablename__ = "highlights"

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
    page_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    cfi_range: Mapped[str | None] = mapped_column(String(512), nullable=True)
    start_offset: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    end_offset: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    selected_text: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(String(32), default="yellow", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    book = relationship("Book", back_populates="highlights")
    user = relationship("User")
    annotations = relationship(
        "Annotation",
        back_populates="highlight",
        cascade="all, delete-orphan",
        order_by="Annotation.created_at",
    )

    __table_args__ = (
        UniqueConstraint(
            "book_id",
            "user_id",
            "page_number",
            "start_offset",
            "end_offset",
            name="uq_highlights_book_user_page_offset",
        ),
        Index("ix_highlights_user_book", "user_id", "book_id"),
    )
