import secrets
import string
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.security import hash_password
from app.config import get_settings
from app.events.dispatcher import event_dispatcher
from app.events.events import DomainEvent
from app.models.activity import ActivityEvent
from app.models.admin_audit_log import AdminAuditLog
from app.models.admin_setting import AdminSetting
from app.models.book import Book
from app.models.book_file import BookFile
from app.models.lending import Lending
from app.models.note_attachment import NoteAttachment
from app.models.reader_state import ReaderState
from app.models.shelf import Shelf
from app.models.user import User
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminAuditLogItem,
    AdminFileItem,
    AdminSettingItem,
    AdminUserDetailResponse,
    AdminUserListItem,
)
from app.storage.backend import get_storage_backend

# In-memory settings cache with 60s TTL
_settings_cache: list[AdminSettingItem] | None = None
_settings_cache_time: float = 0
SETTINGS_CACHE_TTL = 60.0


class AdminService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = get_settings()
        self.storage = get_storage_backend()

    # --- Analytics ---
    async def get_analytics(self) -> AdminAnalyticsResponse:
        now = datetime.now(UTC)
        start_of_month = datetime(now.year, now.month, 1, tzinfo=UTC)
        seven_days_ago = now - timedelta(days=7)

        # Total users
        total_users = await self.session.scalar(select(func.count(User.id))) or 0

        # Book file metrics
        books_with_file = await self.session.scalar(select(func.count(BookFile.id))) or 0
        total_books = await self.session.scalar(select(func.count(Book.id))) or 0
        books_without_file = max(0, total_books - books_with_file)

        # Storage used (book files + note attachments)
        book_file_bytes = await self.session.scalar(select(func.coalesce(func.sum(BookFile.file_size_bytes), 0))) or 0
        note_att_bytes = await self.session.scalar(select(func.coalesce(func.sum(NoteAttachment.file_size_bytes), 0))) or 0
        total_storage_bytes = book_file_bytes + note_att_bytes

        # Active readers (7 days)
        active_readers_count = await self.session.scalar(
            select(func.count(func.distinct(ReaderState.user_id))).where(
                ReaderState.updated_at >= seven_days_ago
            )
        ) or 0

        # Active lendings
        active_lendings = await self.session.scalar(
            select(func.count(Lending.id)).where(Lending.returned_at.is_(None))
        ) or 0

        # Total shelves
        total_shelves = await self.session.scalar(select(func.count(Shelf.id))) or 0

        # New users this month
        new_users_month = await self.session.scalar(
            select(func.count(User.id)).where(User.created_at >= start_of_month)
        ) or 0

        return AdminAnalyticsResponse(
            total_users=total_users,
            total_books_with_file=books_with_file,
            total_books_without_file=books_without_file,
            total_storage_used_bytes=total_storage_bytes,
            active_readers_7d=active_readers_count,
            active_lendings=active_lendings,
            total_shelves=total_shelves,
            new_users_this_month=new_users_month,
        )

    # --- User Management ---
    async def list_users(
        self, search: str | None = None, skip: int = 0, limit: int = 50
    ) -> list[AdminUserListItem]:
        stmt = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
        if search:
            pattern = f"%{search.lower()}%"
            stmt = stmt.where(
                func.lower(User.email).like(pattern) | func.lower(User.name).like(pattern)
            )

        users = (await self.session.execute(stmt)).scalars().all()

        results: list[AdminUserListItem] = []
        for u in users:
            b_count = await self.session.scalar(
                select(func.count(Book.id)).where(Book.owner_id == u.id)
            ) or 0
            s_count = await self.session.scalar(
                select(func.count(Shelf.id)).where(Shelf.owner_id == u.id)
            ) or 0
            file_bytes = await self.session.scalar(
                select(func.coalesce(func.sum(BookFile.file_size_bytes), 0))
                .join(Book, BookFile.book_id == Book.id)
                .where(Book.owner_id == u.id)
            ) or 0

            results.append(
                AdminUserListItem(
                    id=u.id,
                    email=u.email,
                    name=u.name,
                    is_active=u.is_active,
                    created_at=u.created_at,
                    books_count=b_count,
                    shelves_count=s_count,
                    storage_used_bytes=file_bytes,
                )
            )
        return results

    async def get_user_detail(self, user_id: uuid.UUID) -> AdminUserDetailResponse:
        user = await self.session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found"}},
            )

        b_count = await self.session.scalar(
            select(func.count(Book.id)).where(Book.owner_id == user.id)
        ) or 0
        s_count = await self.session.scalar(
            select(func.count(Shelf.id)).where(Shelf.owner_id == user.id)
        ) or 0
        storage_bytes = await self.session.scalar(
            select(func.coalesce(func.sum(BookFile.file_size_bytes), 0))
            .join(Book, BookFile.book_id == Book.id)
            .where(Book.owner_id == user.id)
        ) or 0

        # Recent activities
        act_stmt = (
            select(ActivityEvent)
            .where(ActivityEvent.user_id == user.id)
            .order_by(ActivityEvent.created_at.desc())
            .limit(10)
        )
        activities = (await self.session.execute(act_stmt)).scalars().all()
        act_list = [
            {
                "id": str(a.id),
                "event_type": a.event_type,
                "payload": a.payload,
                "created_at": a.created_at.isoformat(),
            }
            for a in activities
        ]

        return AdminUserDetailResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            books_count=b_count,
            shelves_count=s_count,
            storage_used_bytes=storage_bytes,
            recent_activity=act_list,
        )

    async def set_user_active(
        self,
        admin: User,
        target_user_id: uuid.UUID,
        is_active: bool,
        ip_address: str | None = None,
    ) -> AdminUserListItem:
        if admin.id == target_user_id and not is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "CANNOT_DEACTIVATE_SELF", "message": "Admin cannot deactivate their own account"}},
            )

        target = await self.session.get(User, target_user_id)
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found"}},
            )

        target.is_active = is_active
        action = "USER_REACTIVATED" if is_active else "USER_DEACTIVATED"

        audit = AdminAuditLog(
            admin_id=admin.id,
            action=action,
            target_user_id=target.id,
            details={"is_active": is_active, "target_email": target.email},
            ip_address=ip_address,
        )
        self.session.add(audit)
        await self.session.commit()

        return AdminUserListItem(
            id=target.id,
            email=target.email,
            name=target.name,
            is_active=target.is_active,
            created_at=target.created_at,
        )

    async def reset_user_password(
        self,
        admin: User,
        target_user_id: uuid.UUID,
        new_password: str | None = None,
        ip_address: str | None = None,
    ) -> str:
        target = await self.session.get(User, target_user_id)
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found"}},
            )

        if not new_password:
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            new_password = "".join(secrets.choice(alphabet) for _ in range(16)) + "A1!"

        target.password_hash = hash_password(new_password)

        audit = AdminAuditLog(
            admin_id=admin.id,
            action="PASSWORD_RESET",
            target_user_id=target.id,
            details={"target_email": target.email},
            ip_address=ip_address,
        )
        self.session.add(audit)
        await self.session.commit()

        return new_password

    # --- Moderation ---
    async def list_files(
        self, skip: int = 0, limit: int = 50
    ) -> list[AdminFileItem]:
        stmt = (
            select(BookFile)
            .options(selectinload(BookFile.book).selectinload(Book.owner))
            .order_by(BookFile.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        files = (await self.session.execute(stmt)).scalars().all()

        return [
            AdminFileItem(
                id=f.id,
                book_id=f.book_id,
                book_title=f.book.title if f.book else "Unknown",
                original_name=f.original_name,
                file_size_bytes=f.file_size_bytes,
                mime_type=f.mime_type,
                page_count=f.page_count,
                created_at=f.created_at,
                uploader_email=f.book.owner.email if f.book and f.book.owner else None,
            )
            for f in files
        ]

    async def delete_file(
        self, admin: User, file_id: uuid.UUID, ip_address: str | None = None
    ) -> None:
        stmt = select(BookFile).options(selectinload(BookFile.book)).where(BookFile.id == file_id)
        book_file = (await self.session.execute(stmt)).scalar_one_or_none()
        if not book_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "FILE_NOT_FOUND", "message": "File not found"}},
            )

        # Delete physical file from storage
        try:
            await self.storage.delete(book_file.stored_path)
        except Exception:
            pass

        audit = AdminAuditLog(
            admin_id=admin.id,
            action="CONTENT_DELETED",
            target_file_id=book_file.id,
            details={
                "original_name": book_file.original_name,
                "book_id": str(book_file.book_id),
                "book_title": book_file.book.title if book_file.book else "",
            },
            ip_address=ip_address,
        )
        self.session.add(audit)
        await self.session.delete(book_file)
        await self.session.commit()

    # --- Application Settings with Cache ---
    async def get_settings_list(self) -> list[AdminSettingItem]:
        global _settings_cache, _settings_cache_time
        now = time.time()
        if _settings_cache is not None and (now - _settings_cache_time < SETTINGS_CACHE_TTL):
            return _settings_cache

        stmt = select(AdminSetting).order_by(AdminSetting.key.asc())
        rows = (await self.session.execute(stmt)).scalars().all()

        if not rows:
            default_settings = [
                ("max_upload_size_mb", 100),
                ("allowed_file_types", ["application/pdf", "application/epub+zip"]),
                ("registration_enabled", True),
                ("announcement_banner", ""),
                ("max_books_per_user", 0),
                ("reading_timer_default", 20),
                ("maintenance_mode", False),
            ]
            for k, v in default_settings:
                self.session.add(AdminSetting(key=k, value=v))
            await self.session.commit()
            rows = (await self.session.execute(stmt)).scalars().all()

        items = [AdminSettingItem.model_validate(r) for r in rows]

        _settings_cache = items
        _settings_cache_time = now
        return items

    async def get_setting(self, key: str, default: Any = None) -> Any:
        items = await self.get_settings_list()
        for item in items:
            if item.key == key:
                return item.value
        return default

    async def update_setting(
        self,
        admin: User,
        key: str,
        value: Any,
        ip_address: str | None = None,
    ) -> AdminSettingItem:
        global _settings_cache
        stmt = select(AdminSetting).where(AdminSetting.key == key)
        setting = (await self.session.execute(stmt)).scalar_one_or_none()

        old_val = setting.value if setting else None

        if setting:
            setting.value = value
            setting.updated_at = datetime.now(UTC)
            setting.updated_by = admin.id
        else:
            setting = AdminSetting(
                key=key,
                value=value,
                updated_by=admin.id,
            )
            self.session.add(setting)

        # Write to audit log
        audit = AdminAuditLog(
            admin_id=admin.id,
            action="SETTINGS_CHANGED",
            details={"key": key, "old_value": old_val, "new_value": value},
            ip_address=ip_address,
        )
        self.session.add(audit)
        await self.session.commit()

        # Invalidate in-memory cache
        _settings_cache = None

        # Emit domain event for WebSocket propagation
        await event_dispatcher.publish(
            self.session,
            DomainEvent(
                event_type="SETTINGS_CHANGED",
                entity_type="admin_setting",
                entity_id=setting.id,
                actor_id=admin.id,
                payload={"key": key, "value": value},
            ),
        )

        return AdminSettingItem.model_validate(setting)

    # --- Audit Log ---
    async def list_audit_logs(
        self, skip: int = 0, limit: int = 50
    ) -> list[AdminAuditLogItem]:
        stmt = (
            select(AdminAuditLog)
            .options(selectinload(AdminAuditLog.admin))
            .order_by(AdminAuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).scalars().all()

        return [
            AdminAuditLogItem(
                id=r.id,
                admin_id=r.admin_id,
                admin_email=r.admin.email if r.admin else None,
                action=r.action,
                target_user_id=r.target_user_id,
                target_file_id=r.target_file_id,
                details=r.details,
                ip_address=r.ip_address,
                created_at=r.created_at,
            )
            for r in rows
        ]
