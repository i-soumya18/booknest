from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.book import PaginatedResponse
from app.schemas.lending import BorrowedBookResponse, LendBookRequest, LendingResponse
from app.services.lending_service import LendingService

router = APIRouter(tags=["Lending"])


@router.post(
    "/books/{book_id}/lend",
    response_model=LendingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def lend_book(
    book_id: UUID,
    request_data: LendBookRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> LendingResponse:
    service = LendingService(session)
    return await service.lend_book(
        book_id=book_id,
        owner_id=current_user.id,
        data=request_data,
    )


@router.post("/books/{book_id}/return", response_model=LendingResponse)
async def return_book(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> LendingResponse:
    service = LendingService(session)
    return await service.return_book(
        book_id=book_id,
        owner_id=current_user.id,
    )


@router.get("/borrowed", response_model=PaginatedResponse[BorrowedBookResponse])
async def list_borrowed_books(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedResponse[BorrowedBookResponse]:
    service = LendingService(session)
    return await service.list_borrowed_books(
        borrower_id=current_user.id,
        page=page,
        page_size=page_size,
    )
