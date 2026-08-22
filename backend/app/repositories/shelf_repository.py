from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.models.shelf import Shelf, ShelfBook, ShelfCollaborator
from app.schemas.shelf import ShelfCreateRequest, ShelfUpdateRequest


class ShelfRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, shelf_id: UUID) -> Shelf | None:
        stmt = select(Shelf).where(Shelf.id == shelf_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_id: UUID) -> list[Shelf]:
        stmt = select(Shelf).where(Shelf.owner_id == owner_id).order_by(Shelf.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_shelf(self, owner_id: UUID, data: ShelfCreateRequest) -> Shelf:
        shelf = Shelf(
            owner_id=owner_id,
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
        )
        self.session.add(shelf)
        await self.session.flush()
        return shelf

    async def update_shelf(self, shelf: Shelf, data: ShelfUpdateRequest) -> Shelf:
        if data.name is not None:
            shelf.name = data.name.strip()
        if data.description is not None:
            shelf.description = data.description.strip() if data.description else None
        await self.session.flush()
        return shelf

    async def delete_shelf(self, shelf: Shelf) -> None:
        # Transactional deletion sequence: collaborators -> shelf_books -> shelf
        await self.session.execute(
            delete(ShelfCollaborator).where(ShelfCollaborator.shelf_id == shelf.id)
        )
        await self.session.execute(delete(ShelfBook).where(ShelfBook.shelf_id == shelf.id))
        await self.session.delete(shelf)
        await self.session.flush()

    async def is_book_on_shelf(self, shelf_id: UUID, book_id: UUID) -> bool:
        stmt = select(ShelfBook).where(ShelfBook.shelf_id == shelf_id, ShelfBook.book_id == book_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def add_book_to_shelf(self, shelf_id: UUID, book_id: UUID) -> ShelfBook:
        exists = await self.is_book_on_shelf(shelf_id, book_id)
        if exists:
            stmt = select(ShelfBook).where(
                ShelfBook.shelf_id == shelf_id, ShelfBook.book_id == book_id
            )
            res = await self.session.execute(stmt)
            return res.scalar_one()

        shelf_book = ShelfBook(shelf_id=shelf_id, book_id=book_id)
        self.session.add(shelf_book)
        await self.session.flush()
        return shelf_book

    async def remove_book_from_shelf(self, shelf_id: UUID, book_id: UUID) -> None:
        stmt = delete(ShelfBook).where(ShelfBook.shelf_id == shelf_id, ShelfBook.book_id == book_id)
        await self.session.execute(stmt)
        await self.session.flush()

    async def get_books_for_shelf(self, shelf_id: UUID) -> list[Book]:
        stmt = (
            select(Book)
            .join(ShelfBook, Book.id == ShelfBook.book_id)
            .where(ShelfBook.shelf_id == shelf_id)
            .order_by(ShelfBook.added_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
