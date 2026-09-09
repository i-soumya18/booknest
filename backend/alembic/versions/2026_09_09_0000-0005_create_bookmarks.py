"""create_bookmarks

Revision ID: 0005_create_bookmarks
Revises: 0004_create_highlights_and_annotations
Create Date: 2026-09-09 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_create_bookmarks"
down_revision: str | None = "0004_create_highlights_and_annotations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "bookmarks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("book_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("book_id", "user_id", "page_number", name="uq_bookmarks_book_user_page"),
    )
    op.create_index("ix_bookmarks_user_book", "bookmarks", ["user_id", "book_id"])


def downgrade() -> None:
    op.drop_index("ix_bookmarks_user_book", table_name="bookmarks")
    op.drop_table("bookmarks")
