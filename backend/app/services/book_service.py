import math
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.repositories.book_repository import BookRepository
from app.schemas.book import (
    BookCreateRequest,
    BookResponse,
    BookSortByEnum,
    BookStatusEnum,
    BookUpdateRequest,
    PaginatedResponse,
    ProgressUpdateResponse,
    SortOrderEnum,
)


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

    async def list_user_books(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status: BookStatusEnum | None = None,
        sort_by: BookSortByEnum = BookSortByEnum.CREATED_AT,
        sort_order: SortOrderEnum = SortOrderEnum.DESC,
    ) -> PaginatedResponse[BookResponse]:
        items, total = await self.book_repo.get_paginated_by_owner(
            owner_id=user_id,
            page=page,
            page_size=page_size,
            search=search,
            status=status,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 0
        book_responses = [BookResponse.model_validate(b) for b in items]

        return PaginatedResponse[BookResponse](
            items=book_responses,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )

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

    async def update_reading_progress(
        self, book_id: UUID, user_id: UUID, current_page: int
    ) -> ProgressUpdateResponse:
        book = await self._get_and_ensure_owner(book_id=book_id, user_id=user_id)

        if current_page < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "INVALID_PROGRESS",
                        "message": "current_page cannot be negative",
                    }
                },
            )

        if not book.total_pages or book.total_pages <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "INVALID_TOTAL_PAGES",
                        "message": "total_pages must be set and greater than 0",
                    }
                },
            )

        if current_page > book.total_pages:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "INVALID_PROGRESS",
                        "message": "current_page cannot exceed total_pages",
                    }
                },
            )

        # Atomic state transition
        if current_page == book.total_pages:
            new_status = BookStatusEnum.FINISHED.value
            finished_at = datetime.now(UTC)
        elif book.status == BookStatusEnum.WANT_TO_READ.value and current_page > 0:
            new_status = BookStatusEnum.READING.value
            finished_at = None
        elif book.status == BookStatusEnum.FINISHED.value and current_page < book.total_pages:
            new_status = BookStatusEnum.READING.value
            finished_at = None
        else:
            new_status = book.status
            finished_at = book.finished_at

        updated_book = await self.book_repo.update_progress(
            book=book,
            current_page=current_page,
            status=new_status,
            finished_at=finished_at,
        )
        await self.session.commit()

        pct = math.floor((updated_book.current_page / updated_book.total_pages) * 100)

        return ProgressUpdateResponse(
            id=updated_book.id,
            current_page=updated_book.current_page,
            total_pages=updated_book.total_pages,
            progress_percentage=pct,
            status=BookStatusEnum(updated_book.status),
            finished_at=updated_book.finished_at,
        )

    async def delete_book(self, book_id: UUID, user_id: UUID) -> None:
        book = await self._get_and_ensure_owner(book_id=book_id, user_id=user_id)
        await self.book_repo.delete_book(book)
        await self.session.commit()
