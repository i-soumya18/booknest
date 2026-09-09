"""create_reader_states

Revision ID: 0003_create_reader_states
Revises: 0002_create_book_files
Create Date: 2026-09-09 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_create_reader_states"
down_revision: str | None = "0002_create_book_files"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reader_states",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("book_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("current_page", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("current_position", sa.String(length=512), nullable=True),
        sa.Column("scroll_position", sa.Float(), nullable=True),
        sa.Column("zoom_level", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("theme", sa.String(length=32), nullable=False, server_default="light"),
        sa.Column("font_size", sa.Integer(), nullable=False, server_default="16"),
        sa.Column("focus_mode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("eye_safety_mode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("book_id", "user_id", name="uq_reader_states_book_user"),
    )
    op.create_index("ix_reader_states_user_book", "reader_states", ["user_id", "book_id"])


def downgrade() -> None:
    op.drop_index("ix_reader_states_user_book", table_name="reader_states")
    op.drop_table("reader_states")
