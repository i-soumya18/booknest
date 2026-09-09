"""create_admin_tables_and_user_is_active

Revision ID: 0007_create_admin_tables_and_user_is_active
Revises: 0006_create_reader_notes_and_attachments
Create Date: 2026-09-09 00:00:00.000000

"""

import json
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_create_admin_tables_and_user_is_active"
down_revision: str | None = "0006_create_reader_notes_and_attachments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_SETTINGS = [
    ("max_upload_size_mb", 100),
    ("allowed_file_types", ["application/pdf", "application/epub+zip"]),
    ("registration_enabled", True),
    ("announcement_banner", ""),
    ("max_books_per_user", 0),
    ("reading_timer_default", 20),
    ("maintenance_mode", False),
]


def upgrade() -> None:
    # 1. Add is_active to users
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true())
        )

    # 2. Create admin_settings table
    admin_settings_table = op.create_table(
        "admin_settings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_admin_settings_key", "admin_settings", ["key"])

    # Seed default admin settings
    rows = [
        {
            "id": uuid.uuid4(),
            "key": key,
            "value": val,
        }
        for key, val in DEFAULT_SETTINGS
    ]
    op.bulk_insert(admin_settings_table, rows)

    # 3. Create admin_audit_log table
    op.create_table(
        "admin_audit_log",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("admin_id", sa.UUID(), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_user_id", sa.UUID(), nullable=True),
        sa.Column("target_file_id", sa.UUID(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_file_id"], ["book_files.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_log_created_at", "admin_audit_log", ["created_at"])
    op.create_index("ix_admin_audit_log_action", "admin_audit_log", ["action"])


def downgrade() -> None:
    op.drop_index("ix_admin_audit_log_action", table_name="admin_audit_log")
    op.drop_index("ix_admin_audit_log_created_at", table_name="admin_audit_log")
    op.drop_table("admin_audit_log")

    op.drop_index("ix_admin_settings_key", table_name="admin_settings")
    op.drop_table("admin_settings")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("is_active")
