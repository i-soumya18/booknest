from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.schemas.book import BookCreateRequest, BookUpdateRequest


class BookRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, book_id: UUID) -> Book | None:
        stmt = select(Book).where(Book.id == book_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_id: UUID) -> list[Book]:
        stmt = select(Book).where(Book.owner_id == owner_id).order_by(Book.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

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

    async def delete_book(self, book: Book) -> None:
        await self.session.delete(book)
        await self.session.flush()
