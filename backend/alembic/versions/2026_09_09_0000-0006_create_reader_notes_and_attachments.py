"""create_reader_notes_and_attachments

Revision ID: 0006_create_reader_notes_and_attachments
Revises: 0005_create_bookmarks
Create Date: 2026-09-09 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_create_reader_notes_and_attachments"
down_revision: str | None = "0005_create_bookmarks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reader_notes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("book_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("highlight_id", sa.UUID(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["highlight_id"], ["highlights.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reader_notes_user_book", "reader_notes", ["user_id", "book_id"])
    op.create_index("ix_reader_notes_book_page", "reader_notes", ["book_id", "page_number"])

    op.create_table(
        "note_attachments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("note_id", sa.UUID(), nullable=False),
        sa.Column("attachment_type", sa.String(length=32), nullable=False),
        sa.Column("stored_path", sa.Text(), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["note_id"], ["reader_notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_note_attachments_note_id", "note_attachments", ["note_id"])


def downgrade() -> None:
    op.drop_index("ix_note_attachments_note_id", table_name="note_attachments")
    op.drop_table("note_attachments")
    op.drop_index("ix_reader_notes_book_page", table_name="reader_notes")
    op.drop_index("ix_reader_notes_user_book", table_name="reader_notes")
    op.drop_table("reader_notes")
