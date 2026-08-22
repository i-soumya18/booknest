from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.shelf import (
    ShelfCreateRequest,
    ShelfDetailResponse,
    ShelfResponse,
    ShelfUpdateRequest,
)
from app.services.shelf_service import ShelfService

router = APIRouter(prefix="/shelves", tags=["Shelves"])


@router.post("", response_model=ShelfResponse, status_code=status.HTTP_201_CREATED)
async def create_shelf(
    request_data: ShelfCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ShelfResponse:
    service = ShelfService(session)
    return await service.create_shelf(owner_id=current_user.id, data=request_data)


@router.get("", response_model=list[ShelfResponse])
async def list_shelves(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[ShelfResponse]:
    service = ShelfService(session)
    return await service.list_user_shelves(user_id=current_user.id)


@router.get("/{shelf_id}", response_model=ShelfDetailResponse)
async def get_shelf(
    shelf_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ShelfDetailResponse:
    service = ShelfService(session)
    return await service.get_shelf_detail(shelf_id=shelf_id, user_id=current_user.id)


@router.put("/{shelf_id}", response_model=ShelfResponse)
async def update_shelf(
    shelf_id: UUID,
    request_data: ShelfUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ShelfResponse:
    service = ShelfService(session)
    return await service.update_shelf(shelf_id=shelf_id, user_id=current_user.id, data=request_data)


@router.delete("/{shelf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shelf(
    shelf_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = ShelfService(session)
    await service.delete_shelf(shelf_id=shelf_id, user_id=current_user.id)


@router.post(
    "/{shelf_id}/books/{book_id}",
    status_code=status.HTTP_201_CREATED,
)
async def add_book_to_shelf(
    shelf_id: UUID,
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    service = ShelfService(session)
    await service.add_book_to_shelf(shelf_id=shelf_id, book_id=book_id, user_id=current_user.id)
    return {"message": "Book added to shelf successfully"}


@router.delete(
    "/{shelf_id}/books/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_book_from_shelf(
    shelf_id: UUID,
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = ShelfService(session)
    await service.remove_book_from_shelf(
        shelf_id=shelf_id, book_id=book_id, user_id=current_user.id
    )
