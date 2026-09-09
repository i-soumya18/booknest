import uuid
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.annotation import Annotation
from app.models.book import Book
from app.models.highlight import Highlight
from app.models.user import User
from app.repositories.book_repository import BookRepository
from app.repositories.highlight_repository import AnnotationRepository, HighlightRepository
from app.repositories.lending_repository import LendingRepository
from app.schemas.highlight import (
    AnnotationCreate,
    AnnotationUpdate,
    HighlightCreate,
    HighlightUpdate,
)


class AnnotationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.highlight_repo = HighlightRepository(session)
        self.annotation_repo = AnnotationRepository(session)
        self.book_repo = BookRepository(session)
        self.lending_repo = LendingRepository(session)
        self.settings = get_settings()

    def _is_admin(self, user: User) -> bool:
        return user.email.lower() == self.settings.admin_email.lower()

    async def _check_read_access(self, book: Book, user: User) -> None:
        if self._is_admin(user) or book.owner_id == user.id:
            return

        active_lending = await self.lending_repo.get_active_lending_by_book(book.id)
        if active_lending and active_lending.borrower_id == user.id:
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have access to this book",
                }
            },
        )

    async def list_highlights(self, book_id: UUID, user: User) -> list[Highlight]:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self._check_read_access(book, user)
        # Always return private highlights for the requesting user (§61)
        return await self.highlight_repo.list_by_book_and_user(book_id, user.id)

    async def create_highlight(
        self, book_id: UUID, user: User, data: HighlightCreate
    ) -> Highlight:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self._check_read_access(book, user)

        highlight = Highlight(
            book_id=book_id,
            user_id=user.id,
            page_number=data.page_number,
            cfi_range=data.cfi_range,
            start_offset=data.start_offset,
            end_offset=data.end_offset,
            selected_text=data.selected_text.strip(),
            color=data.color,
        )

        created = await self.highlight_repo.create(highlight)
        await self.session.commit()
        # Fetch with eager load
        return await self.highlight_repo.get_by_id(created.id) or created

    async def update_highlight(
        self, highlight_id: UUID, user: User, data: HighlightUpdate
    ) -> Highlight:
        highlight = await self.highlight_repo.get_by_id(highlight_id)
        if not highlight:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "HIGHLIGHT_NOT_FOUND", "message": "Highlight not found"}},
            )

        # Private to creator
        if highlight.user_id != user.id and not self._is_admin(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Cannot modify another user's highlight"}},
            )

        if data.color is not None:
            highlight.color = data.color
        highlight.updated_at = datetime.now(UTC)

        await self.session.commit()
        return highlight

    async def delete_highlight(self, highlight_id: UUID, user: User) -> None:
        highlight = await self.highlight_repo.get_by_id(highlight_id)
        if not highlight:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "HIGHLIGHT_NOT_FOUND", "message": "Highlight not found"}},
            )

        if highlight.user_id != user.id and not self._is_admin(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Cannot delete another user's highlight"}},
            )

        await self.highlight_repo.delete(highlight)
        await self.session.commit()

    async def add_annotation(
        self, highlight_id: UUID, user: User, data: AnnotationCreate
    ) -> Annotation:
        highlight = await self.highlight_repo.get_by_id(highlight_id)
        if not highlight:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "HIGHLIGHT_NOT_FOUND", "message": "Highlight not found"}},
            )

        if highlight.user_id != user.id and not self._is_admin(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Cannot annotate another user's highlight"}},
            )

        annotation = Annotation(
            highlight_id=highlight_id,
            user_id=user.id,
            content=data.content.strip(),
        )
        created = await self.annotation_repo.create(annotation)
        await self.session.commit()
        return created

    async def update_annotation(
        self, annotation_id: UUID, user: User, data: AnnotationUpdate
    ) -> Annotation:
        annotation = await self.annotation_repo.get_by_id(annotation_id)
        if not annotation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "ANNOTATION_NOT_FOUND", "message": "Annotation not found"}},
            )

        if annotation.user_id != user.id and not self._is_admin(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Cannot modify another user's annotation"}},
            )

        annotation.content = data.content.strip()
        annotation.updated_at = datetime.now(UTC)
        await self.session.commit()
        return annotation

    async def delete_annotation(self, annotation_id: UUID, user: User) -> None:
        annotation = await self.annotation_repo.get_by_id(annotation_id)
        if not annotation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "ANNOTATION_NOT_FOUND", "message": "Annotation not found"}},
            )

        if annotation.user_id != user.id and not self._is_admin(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Cannot delete another user's annotation"}},
            )

        await self.annotation_repo.delete(annotation)
        await self.session.commit()
