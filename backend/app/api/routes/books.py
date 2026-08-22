from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.book import BookCreateRequest, BookResponse, BookUpdateRequest
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


@router.get("", response_model=list[BookResponse])
async def list_books(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[BookResponse]:
    service = BookService(session)
    books = await service.list_user_books(user_id=current_user.id)
    return [BookResponse.model_validate(b) for b in books]


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
