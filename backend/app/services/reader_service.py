import math
import uuid
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.events.dispatcher import DomainEvent, event_dispatcher
from app.models.book import Book
from app.models.reader_state import ReaderState
from app.models.user import User
from app.repositories.book_repository import BookRepository
from app.repositories.lending_repository import LendingRepository
from app.repositories.reader_state_repository import ReaderStateRepository
from app.schemas.book import BookStatusEnum
from app.schemas.reader_state import ReaderProgressUpdate


class ReaderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.reader_state_repo = ReaderStateRepository(session)
        self.book_repo = BookRepository(session)
        self.lending_repo = LendingRepository(session)
        self.settings = get_settings()

    def _is_admin(self, user: User) -> bool:
        return user.email.lower() == self.settings.admin_email.lower()

    async def _check_read_access(self, book: Book, user: User) -> None:
        if self._is_admin(user):
            return
        if book.owner_id == user.id:
            return

        active_lending = await self.lending_repo.get_active_lending_by_book(book.id)
        if active_lending and active_lending.borrower_id == user.id:
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have access to this book's reader",
                }
            },
        )

    async def get_or_create_reader_state(self, book_id: UUID, user: User) -> ReaderState:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self._check_read_access(book, user)

        state = await self.reader_state_repo.get_by_book_and_user(book_id, user.id)
        if not state:
            initial_page = max(1, book.current_page) if book.owner_id == user.id and book.current_page > 0 else 1
            state = ReaderState(
                book_id=book.id,
                user_id=user.id,
                current_page=initial_page,
                current_position=None,
                scroll_position=0.0,
                zoom_level=1.0,
                theme="light",
                font_size=16,
                focus_mode=False,
                eye_safety_mode=False,
            )
            state = await self.reader_state_repo.create(state)
            await self.session.commit()

        return state

    async def update_reader_progress(
        self, book_id: UUID, user: User, payload: ReaderProgressUpdate
    ) -> ReaderState:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self._check_read_access(book, user)

        state = await self.reader_state_repo.get_by_book_and_user(book_id, user.id)
        if not state:
            state = ReaderState(
                book_id=book.id,
                user_id=user.id,
                current_page=1,
                current_position=None,
                scroll_position=0.0,
                zoom_level=1.0,
                theme="light",
                font_size=16,
                focus_mode=False,
                eye_safety_mode=False,
            )
            state = await self.reader_state_repo.create(state)

        # Update reader preferences & positions
        if payload.current_page is not None:
            state.current_page = payload.current_page

            # Synchronize with V1 reading progress if user is book owner
            if user.id == book.owner_id:
                target_page = min(payload.current_page, book.total_pages)
                old_status = book.status

                if target_page >= book.total_pages:
                    new_status = BookStatusEnum.FINISHED.value
                    finished_at = datetime.now(UTC)
                elif book.status == BookStatusEnum.WANT_TO_READ.value:
                    new_status = BookStatusEnum.READING.value
                    finished_at = None
                else:
                    new_status = book.status
                    finished_at = book.finished_at

                updated_book = await self.book_repo.update_progress(
                    book=book,
                    current_page=target_page,
                    status=new_status,
                    finished_at=finished_at,
                )

                pct = math.floor((updated_book.current_page / updated_book.total_pages) * 100)
                await event_dispatcher.publish(
                    self.session,
                    DomainEvent(
                        event_type="BOOK_PROGRESS_UPDATED",
                        entity_type="book",
                        entity_id=updated_book.id,
                        actor_id=user.id,
                        book_id=updated_book.id,
                        payload={
                            "title": updated_book.title,
                            "current_page": updated_book.current_page,
                            "total_pages": updated_book.total_pages,
                            "progress_percentage": pct,
                            "status": updated_book.status,
                        },
                    ),
                )

                if old_status != updated_book.status:
                    await event_dispatcher.publish(
                        self.session,
                        DomainEvent(
                            event_type="BOOK_STATUS_CHANGED",
                            entity_type="book",
                            entity_id=updated_book.id,
                            actor_id=user.id,
                            book_id=updated_book.id,
                            payload={
                                "title": updated_book.title,
                                "old_status": old_status,
                                "new_status": updated_book.status,
                            },
                        ),
                    )

        if payload.current_position is not None:
            state.current_position = payload.current_position
        if payload.scroll_position is not None:
            state.scroll_position = payload.scroll_position
        if payload.zoom_level is not None:
            state.zoom_level = payload.zoom_level
        if payload.theme is not None:
            state.theme = payload.theme
        if payload.font_size is not None:
            state.font_size = payload.font_size
        if payload.focus_mode is not None:
            state.focus_mode = payload.focus_mode
        if payload.eye_safety_mode is not None:
            state.eye_safety_mode = payload.eye_safety_mode

        state.updated_at = datetime.now(UTC)
        await self.session.commit()
        return state
