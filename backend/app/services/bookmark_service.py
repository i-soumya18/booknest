import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.book import Book
from app.models.bookmark import Bookmark
from app.models.user import User
from app.repositories.book_repository import BookRepository
from app.repositories.bookmark_repository import BookmarkRepository
from app.repositories.lending_repository import LendingRepository
from app.schemas.bookmark import BookmarkCreate


class BookmarkService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.bookmark_repo = BookmarkRepository(session)
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

    async def list_bookmarks(self, book_id: UUID, user: User) -> list[Bookmark]:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self._check_read_access(book, user)
        # Always return private bookmarks for the requesting user
        return await self.bookmark_repo.list_by_book_and_user(book_id, user.id)

    async def create_bookmark(
        self, book_id: UUID, user: User, data: BookmarkCreate
    ) -> Bookmark:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self._check_read_access(book, user)

        # Check existing bookmark on this page
        existing = await self.bookmark_repo.get_by_book_user_page(
            book_id, user.id, data.page_number
        )
        if existing:
            # Update label if provided
            if data.label is not None:
                existing.label = data.label.strip() if data.label.strip() else None
            await self.session.commit()
            return existing

        label = data.label.strip() if data.label and data.label.strip() else f"Page {data.page_number}"
        bookmark = Bookmark(
            book_id=book_id,
            user_id=user.id,
            page_number=data.page_number,
            label=label,
        )
        created = await self.bookmark_repo.create(bookmark)
        await self.session.commit()
        return created

    async def delete_bookmark(self, bookmark_id: UUID, user: User) -> None:
        bookmark = await self.bookmark_repo.get_by_id(bookmark_id)
        if not bookmark:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOKMARK_NOT_FOUND", "message": "Bookmark not found"}},
            )

        if bookmark.user_id != user.id and not self._is_admin(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Cannot delete another user's bookmark"}},
            )

        await self.bookmark_repo.delete(bookmark)
        await self.session.commit()
