from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.schemas.book import (
    BookCreateRequest,
    BookSortByEnum,
    BookStatusEnum,
    BookUpdateRequest,
    SortOrderEnum,
)


class BookRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, book_id: UUID) -> Book | None:
        stmt = select(Book).where(Book.id == book_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_paginated_by_owner(
        self,
        owner_id: UUID,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status: BookStatusEnum | None = None,
        sort_by: BookSortByEnum = BookSortByEnum.CREATED_AT,
        sort_order: SortOrderEnum = SortOrderEnum.DESC,
    ) -> tuple[list[Book], int]:
        stmt = select(Book).where(Book.owner_id == owner_id)

        if status is not None:
            stmt = stmt.where(Book.status == status.value)

        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(or_(Book.title.ilike(term), Book.author.ilike(term)))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total_count = total_result.scalar_one() or 0

        if sort_by == BookSortByEnum.TITLE:
            sort_column = Book.title
        elif sort_by == BookSortByEnum.RATING:
            sort_column = Book.rating
        else:
            sort_column = Book.created_at

        order_clause = sort_column.desc() if sort_order == SortOrderEnum.DESC else sort_column.asc()
        stmt = stmt.order_by(order_clause, Book.id.desc())

        offset_val = (page - 1) * page_size
        stmt = stmt.offset(offset_val).limit(page_size)

        result = await self.session.execute(stmt)
        items = list(result.scalars().all())
        return items, total_count

    async def create_book(self, owner_id: UUID, data: BookCreateRequest) -> Book:
        book = Book(
            owner_id=owner_id,
            title=data.title.strip(),
            author=data.author.strip(),
            status=data.status.value,
            total_pages=data.total_pages,
            current_page=data.current_page,
            rating=data.rating,
            notes=data.notes.strip() if data.notes else None,
        )
        self.session.add(book)
        await self.session.flush()
        return book

    async def update_book(self, book: Book, data: BookUpdateRequest) -> Book:
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if key == "status" and value is not None:
                setattr(book, key, value.value if hasattr(value, "value") else str(value))
            elif key in ("title", "author", "notes") and isinstance(value, str):
                setattr(book, key, value.strip())
            else:
                setattr(book, key, value)
        await self.session.flush()
        return book

    async def update_progress(
        self, book: Book, current_page: int, status: str, finished_at: datetime | None
    ) -> Book:
        book.current_page = current_page
        book.status = status
        book.finished_at = finished_at
        await self.session.flush()
        return book

    async def delete_book(self, book: Book) -> None:
        await self.session.delete(book)
        await self.session.flush()
