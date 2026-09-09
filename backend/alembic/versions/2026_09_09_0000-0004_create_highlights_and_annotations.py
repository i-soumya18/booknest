"""create_highlights_and_annotations

Revision ID: 0004_create_highlights_and_annotations
Revises: 0003_create_reader_states
Create Date: 2026-09-09 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_create_highlights_and_annotations"
down_revision: str | None = "0003_create_reader_states"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "highlights",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("book_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("cfi_range", sa.String(length=512), nullable=True),
        sa.Column("start_offset", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("end_offset", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("selected_text", sa.Text(), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False, server_default="yellow"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "book_id",
            "user_id",
            "page_number",
            "start_offset",
            "end_offset",
            name="uq_highlights_book_user_page_offset",
        ),
    )
    op.create_index("ix_highlights_user_book", "highlights", ["user_id", "book_id"])

    op.create_table(
        "annotations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("highlight_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["highlight_id"], ["highlights.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_annotations_highlight_id", "annotations", ["highlight_id"])
    op.create_index("ix_annotations_user_id", "annotations", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_annotations_user_id", table_name="annotations")
    op.drop_index("ix_annotations_highlight_id", table_name="annotations")
    op.drop_table("annotations")

    op.drop_index("ix_highlights_user_book", table_name="highlights")
    op.drop_table("highlights")
