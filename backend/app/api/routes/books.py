from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.book import (
    BookCreateRequest,
    BookResponse,
    BookSortByEnum,
    BookStatusEnum,
    BookUpdateRequest,
    PaginatedResponse,
    SortOrderEnum,
)
from app.services.book_service import BookService

router = APIRouter(prefix="/books", tags=["Books"])


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    request_data: BookCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> BookResponse:
    service = BookService(session)
    book = await service.create_book(owner_id=current_user.id, data=request_data)
    return BookResponse.model_validate(book)


@router.get("", response_model=PaginatedResponse[BookResponse])
async def list_books(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    book_status: BookStatusEnum | None = Query(default=None, alias="status"),
    sort_by: BookSortByEnum = Query(default=BookSortByEnum.CREATED_AT),
    sort_order: SortOrderEnum = Query(default=SortOrderEnum.DESC),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedResponse[BookResponse]:
    service = BookService(session)
    return await service.list_user_books(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        search=search,
        status=book_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> BookResponse:
    service = BookService(session)
    book = await service.get_book(book_id=book_id, user_id=current_user.id)
    return BookResponse.model_validate(book)


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: UUID,
    request_data: BookUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> BookResponse:
    service = BookService(session)
    book = await service.update_book(book_id=book_id, user_id=current_user.id, data=request_data)
    return BookResponse.model_validate(book)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = BookService(session)
    await service.delete_book(book_id=book_id, user_id=current_user.id)
