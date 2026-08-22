from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.models.shelf import Shelf, ShelfBook, ShelfCollaborator
from app.models.user import User
from app.schemas.shelf import ShelfCreateRequest, ShelfRoleEnum, ShelfUpdateRequest


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

    # --- Collaborator & RBAC Methods ---

    async def get_collaborator(self, shelf_id: UUID, user_id: UUID) -> ShelfCollaborator | None:
        stmt = select(ShelfCollaborator).where(
            ShelfCollaborator.shelf_id == shelf_id,
            ShelfCollaborator.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_shared_shelves_for_user(self, user_id: UUID) -> list[tuple[Shelf, ShelfRoleEnum]]:
        stmt = (
            select(Shelf, ShelfCollaborator.role)
            .join(ShelfCollaborator, Shelf.id == ShelfCollaborator.shelf_id)
            .where(ShelfCollaborator.user_id == user_id)
            .order_by(ShelfCollaborator.added_at.desc())
        )
        result = await self.session.execute(stmt)
        return [(shelf, ShelfRoleEnum(role)) for shelf, role in result.all()]

    async def get_collaborators_for_shelf(
        self, shelf_id: UUID
    ) -> list[tuple[User, ShelfCollaborator]]:
        stmt = (
            select(User, ShelfCollaborator)
            .join(ShelfCollaborator, User.id == ShelfCollaborator.user_id)
            .where(ShelfCollaborator.shelf_id == shelf_id)
            .order_by(ShelfCollaborator.added_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def add_collaborator(
        self, shelf_id: UUID, user_id: UUID, role: ShelfRoleEnum
    ) -> ShelfCollaborator:
        collaborator = ShelfCollaborator(shelf_id=shelf_id, user_id=user_id, role=role.value)
        self.session.add(collaborator)
        await self.session.flush()
        return collaborator

    async def update_collaborator_role(
        self, shelf_id: UUID, user_id: UUID, role: ShelfRoleEnum
    ) -> ShelfCollaborator:
        collaborator = await self.get_collaborator(shelf_id, user_id)
        if collaborator:
            collaborator.role = role.value
            await self.session.flush()
        return collaborator

    async def remove_collaborator(self, shelf_id: UUID, user_id: UUID) -> None:
        stmt = delete(ShelfCollaborator).where(
            ShelfCollaborator.shelf_id == shelf_id,
            ShelfCollaborator.user_id == user_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()
