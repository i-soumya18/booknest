from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shelf import Shelf
from app.repositories.book_repository import BookRepository
from app.repositories.shelf_repository import ShelfRepository
from app.schemas.book import BookResponse
from app.schemas.shelf import (
    ShelfCreateRequest,
    ShelfDetailResponse,
    ShelfResponse,
    ShelfUpdateRequest,
)


class ShelfService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.shelf_repo = ShelfRepository(session)
        self.book_repo = BookRepository(session)

    async def _get_and_ensure_owner(self, shelf_id: UUID, user_id: UUID) -> Shelf:
        shelf = await self.shelf_repo.get_by_id(shelf_id)
        if not shelf or shelf.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "SHELF_NOT_FOUND", "message": "Shelf not found"}},
            )
        return shelf

    async def create_shelf(self, owner_id: UUID, data: ShelfCreateRequest) -> ShelfResponse:
        shelf = await self.shelf_repo.create_shelf(owner_id=owner_id, data=data)
        await self.session.commit()
        return ShelfResponse.model_validate(shelf)

    async def list_user_shelves(self, user_id: UUID) -> list[ShelfResponse]:
        shelves = await self.shelf_repo.get_by_owner(owner_id=user_id)
        return [ShelfResponse.model_validate(s) for s in shelves]

    async def get_shelf_detail(self, shelf_id: UUID, user_id: UUID) -> ShelfDetailResponse:
        shelf = await self._get_and_ensure_owner(shelf_id=shelf_id, user_id=user_id)
        books = await self.shelf_repo.get_books_for_shelf(shelf_id=shelf.id)

        shelf_resp = ShelfResponse.model_validate(shelf)
        book_resps = [BookResponse.model_validate(b) for b in books]

        return ShelfDetailResponse(
            id=shelf_resp.id,
            owner_id=shelf_resp.owner_id,
            name=shelf_resp.name,
            description=shelf_resp.description,
            created_at=shelf_resp.created_at,
            updated_at=shelf_resp.updated_at,
            books=book_resps,
        )

    async def update_shelf(
        self, shelf_id: UUID, user_id: UUID, data: ShelfUpdateRequest
    ) -> ShelfResponse:
        shelf = await self._get_and_ensure_owner(shelf_id=shelf_id, user_id=user_id)
        updated_shelf = await self.shelf_repo.update_shelf(shelf=shelf, data=data)
        await self.session.commit()
        return ShelfResponse.model_validate(updated_shelf)

    async def delete_shelf(self, shelf_id: UUID, user_id: UUID) -> None:
        shelf = await self._get_and_ensure_owner(shelf_id=shelf_id, user_id=user_id)
        await self.shelf_repo.delete_shelf(shelf)
        await self.session.commit()

    async def add_book_to_shelf(self, shelf_id: UUID, book_id: UUID, user_id: UUID) -> None:
        shelf = await self._get_and_ensure_owner(shelf_id=shelf_id, user_id=user_id)

        book = await self.book_repo.get_by_id(book_id)
        if not book or book.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self.shelf_repo.add_book_to_shelf(shelf_id=shelf.id, book_id=book.id)
        await self.session.commit()

    async def remove_book_from_shelf(self, shelf_id: UUID, book_id: UUID, user_id: UUID) -> None:
        shelf = await self._get_and_ensure_owner(shelf_id=shelf_id, user_id=user_id)
        await self.shelf_repo.remove_book_from_shelf(shelf_id=shelf.id, book_id=book_id)
        await self.session.commit()
