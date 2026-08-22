from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.repositories.book_repository import BookRepository
from app.schemas.book import BookCreateRequest, BookUpdateRequest


class BookService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.book_repo = BookRepository(session)

    async def _get_and_ensure_owner(self, book_id: UUID, user_id: UUID) -> Book:
        book = await self.book_repo.get_by_id(book_id)
        if not book or book.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )
        return book

    async def create_book(self, owner_id: UUID, data: BookCreateRequest) -> Book:
        if data.current_page > data.total_pages:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "INVALID_PAGE_COUNT",
                        "message": "current_page cannot exceed total_pages",
                    }
                },
            )
        book = await self.book_repo.create_book(owner_id=owner_id, data=data)
        await self.session.commit()
        return book

    async def get_book(self, book_id: UUID, user_id: UUID) -> Book:
        return await self._get_and_ensure_owner(book_id=book_id, user_id=user_id)

    async def list_user_books(self, user_id: UUID) -> list[Book]:
        return await self.book_repo.get_by_owner(owner_id=user_id)

    async def update_book(self, book_id: UUID, user_id: UUID, data: BookUpdateRequest) -> Book:
        book = await self._get_and_ensure_owner(book_id=book_id, user_id=user_id)

        target_total = data.total_pages if data.total_pages is not None else book.total_pages
        target_current = data.current_page if data.current_page is not None else book.current_page

        if target_current > target_total:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "INVALID_PAGE_COUNT",
                        "message": "current_page cannot exceed total_pages",
                    }
                },
            )

        updated_book = await self.book_repo.update_book(book=book, data=data)
        await self.session.commit()
        return updated_book

    async def delete_book(self, book_id: UUID, user_id: UUID) -> None:
        book = await self._get_and_ensure_owner(book_id=book_id, user_id=user_id)
        await self.book_repo.delete_book(book)
        await self.session.commit()
