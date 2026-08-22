from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shelf import Shelf
from app.repositories.book_repository import BookRepository
from app.repositories.shelf_repository import ShelfRepository
from app.repositories.user_repository import UserRepository
from app.schemas.book import BookResponse
from app.schemas.shelf import (
    CollaboratorResponse,
    ShelfCreateRequest,
    ShelfDetailResponse,
    ShelfResponse,
    ShelfRoleEnum,
    ShelfUpdateRequest,
)

ROLE_RANK = {
    ShelfRoleEnum.OWNER: 3,
    ShelfRoleEnum.EDITOR: 2,
    ShelfRoleEnum.VIEWER: 1,
}


class ShelfService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.shelf_repo = ShelfRepository(session)
        self.book_repo = BookRepository(session)
        self.user_repo = UserRepository(session)

    async def _get_shelf_and_check_role(
        self, shelf_id: UUID, user_id: UUID, min_role: ShelfRoleEnum
    ) -> tuple[Shelf, ShelfRoleEnum]:
        shelf = await self.shelf_repo.get_by_id(shelf_id)
        if not shelf:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "SHELF_NOT_FOUND", "message": "Shelf not found"}},
            )

        if shelf.owner_id == user_id:
            user_role = ShelfRoleEnum.OWNER
        else:
            collab = await self.shelf_repo.get_collaborator(shelf_id, user_id)
            if not collab:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error": {"code": "SHELF_NOT_FOUND", "message": "Shelf not found"}},
                )
            user_role = ShelfRoleEnum(collab.role)

        if ROLE_RANK[user_role] < ROLE_RANK[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Insufficient permissions for this operation",
                    }
                },
            )

        return shelf, user_role

    async def create_shelf(self, owner_id: UUID, data: ShelfCreateRequest) -> ShelfResponse:
        shelf = await self.shelf_repo.create_shelf(owner_id=owner_id, data=data)
        await self.session.commit()
        resp = ShelfResponse.model_validate(shelf)
        resp.user_role = ShelfRoleEnum.OWNER
        return resp

    async def list_user_shelves(self, user_id: UUID) -> list[ShelfResponse]:
        # Owned shelves
        owned = await self.shelf_repo.get_by_owner(owner_id=user_id)
        resps = []
        for s in owned:
            r = ShelfResponse.model_validate(s)
            r.user_role = ShelfRoleEnum.OWNER
            resps.append(r)

        # Shared shelves
        shared = await self.shelf_repo.get_shared_shelves_for_user(user_id=user_id)
        for s, role in shared:
            r = ShelfResponse.model_validate(s)
            r.user_role = role
            resps.append(r)

        return resps

    async def list_shared_shelves(self, user_id: UUID) -> list[ShelfResponse]:
        shared = await self.shelf_repo.get_shared_shelves_for_user(user_id=user_id)
        resps = []
        for s, role in shared:
            r = ShelfResponse.model_validate(s)
            r.user_role = role
            resps.append(r)
        return resps

    async def get_shelf_detail(self, shelf_id: UUID, user_id: UUID) -> ShelfDetailResponse:
        shelf, user_role = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=user_id, min_role=ShelfRoleEnum.VIEWER
        )
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
            user_role=user_role,
            books=book_resps,
        )

    async def update_shelf(
        self, shelf_id: UUID, user_id: UUID, data: ShelfUpdateRequest
    ) -> ShelfResponse:
        shelf, user_role = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=user_id, min_role=ShelfRoleEnum.OWNER
        )
        updated_shelf = await self.shelf_repo.update_shelf(shelf=shelf, data=data)
        await self.session.commit()
        resp = ShelfResponse.model_validate(updated_shelf)
        resp.user_role = user_role
        return resp

    async def delete_shelf(self, shelf_id: UUID, user_id: UUID) -> None:
        shelf, _ = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=user_id, min_role=ShelfRoleEnum.OWNER
        )
        await self.shelf_repo.delete_shelf(shelf)
        await self.session.commit()

    async def add_book_to_shelf(self, shelf_id: UUID, book_id: UUID, user_id: UUID) -> None:
        shelf, _ = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=user_id, min_role=ShelfRoleEnum.EDITOR
        )

        book = await self.book_repo.get_by_id(book_id)
        if not book or (book.owner_id != user_id and book.owner_id != shelf.owner_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        await self.shelf_repo.add_book_to_shelf(shelf_id=shelf.id, book_id=book.id)
        await self.session.commit()

    async def remove_book_from_shelf(self, shelf_id: UUID, book_id: UUID, user_id: UUID) -> None:
        shelf, _ = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=user_id, min_role=ShelfRoleEnum.EDITOR
        )
        await self.shelf_repo.remove_book_from_shelf(shelf_id=shelf.id, book_id=book_id)
        await self.session.commit()

    # --- Collaborator & RBAC Service Operations ---

    async def add_collaborator_by_email(
        self, shelf_id: UUID, owner_id: UUID, email: str, role: ShelfRoleEnum
    ) -> CollaboratorResponse:
        shelf, _ = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=owner_id, min_role=ShelfRoleEnum.OWNER
        )

        if role == ShelfRoleEnum.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_ROLE",
                        "message": "Cannot assign OWNER role via share",
                    }
                },
            )

        target_user = await self.user_repo.get_by_email(email.strip().lower())
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {"code": "USER_NOT_FOUND", "message": "User with this email not found"}
                },
            )

        if target_user.id == shelf.owner_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_COLLABORATOR",
                        "message": "Owner is already the shelf owner",
                    }
                },
            )

        existing = await self.shelf_repo.get_collaborator(shelf.id, target_user.id)
        if existing:
            collab = await self.shelf_repo.update_collaborator_role(shelf.id, target_user.id, role)
        else:
            collab = await self.shelf_repo.add_collaborator(shelf.id, target_user.id, role)

        await self.session.commit()
        return CollaboratorResponse(
            user_id=target_user.id,
            email=target_user.email,
            name=target_user.name,
            role=ShelfRoleEnum(collab.role),
            created_at=collab.added_at,
        )

    async def update_collaborator_role(
        self, shelf_id: UUID, owner_id: UUID, target_user_id: UUID, new_role: ShelfRoleEnum
    ) -> CollaboratorResponse:
        shelf, _ = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=owner_id, min_role=ShelfRoleEnum.OWNER
        )

        if new_role == ShelfRoleEnum.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_ROLE",
                        "message": "Cannot assign OWNER role to collaborator",
                    }
                },
            )

        collab = await self.shelf_repo.get_collaborator(shelf.id, target_user_id)
        if not collab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "COLLABORATOR_NOT_FOUND",
                        "message": "Collaborator not found on this shelf",
                    }
                },
            )

        target_user = await self.user_repo.get_by_id(target_user_id)
        assert target_user is not None

        collab = await self.shelf_repo.update_collaborator_role(shelf.id, target_user_id, new_role)
        await self.session.commit()

        return CollaboratorResponse(
            user_id=target_user.id,
            email=target_user.email,
            name=target_user.name,
            role=ShelfRoleEnum(collab.role),
            created_at=collab.added_at,
        )

    async def remove_collaborator(
        self, shelf_id: UUID, current_user_id: UUID, target_user_id: UUID
    ) -> None:
        # Either shelf owner or self removing from shelf
        shelf = await self.shelf_repo.get_by_id(shelf_id)
        if not shelf:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "SHELF_NOT_FOUND", "message": "Shelf not found"}},
            )

        if shelf.owner_id != current_user_id and current_user_id != target_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Only shelf owner can remove collaborators",
                    }
                },
            )

        await self.shelf_repo.remove_collaborator(shelf.id, target_user_id)
        await self.session.commit()

    async def list_collaborators(
        self, shelf_id: UUID, current_user_id: UUID
    ) -> list[CollaboratorResponse]:
        shelf, _ = await self._get_shelf_and_check_role(
            shelf_id=shelf_id, user_id=current_user_id, min_role=ShelfRoleEnum.VIEWER
        )
        items = await self.shelf_repo.get_collaborators_for_shelf(shelf.id)
        return [
            CollaboratorResponse(
                user_id=user.id,
                email=user.email,
                name=user.name,
                role=ShelfRoleEnum(collab.role),
                created_at=collab.added_at,
            )
            for user, collab in items
        ]
