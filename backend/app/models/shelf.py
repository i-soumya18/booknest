import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Shelf(Base):
    __tablename__ = "shelves"

    __table_args__ = (Index("idx_shelves_owner_id", "owner_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    owner = relationship("User", back_populates="shelves")
    book_links = relationship("ShelfBook", back_populates="shelf", cascade="all, delete-orphan")
    collaborators = relationship(
        "ShelfCollaborator", back_populates="shelf", cascade="all, delete-orphan"
    )


class ShelfBook(Base):
    """Junction table linking Shelves and Books M:N with composite Primary Key."""

    __tablename__ = "shelf_books"

    shelf_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shelves.id", ondelete="CASCADE"), primary_key=True
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), primary_key=True
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    shelf = relationship("Shelf", back_populates="book_links")
    book = relationship("Book", back_populates="shelf_links")


class ShelfCollaborator(Base):
    """Junction table linking Shelves and Users for RBAC with composite Primary Key."""

    __tablename__ = "shelf_collaborators"

    __table_args__ = (Index("idx_shelf_collaborators_user", "user_id"),)

    shelf_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shelves.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # OWNER, EDITOR, VIEWER
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    shelf = relationship("Shelf", back_populates="collaborators")
    user = relationship("User")
