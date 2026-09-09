from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
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
    ProgressUpdateRequest,
    ProgressUpdateResponse,
    SortOrderEnum,
)
from app.schemas.book_file import BookFileResponse
from app.schemas.reader_state import ReaderProgressUpdate, ReaderStateRead
from app.services.book_service import BookService
from app.services.file_upload_service import FileUploadService
from app.services.reader_service import ReaderService

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


@router.post("/upload", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def upload_first_book(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    author: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> BookResponse:
    service = FileUploadService(session)
    book = await service.upload_first(
        user=current_user,
        file=file,
        title=title,
        author=author,
    )
    return BookResponse.model_validate(book)


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


@router.patch("/{book_id}/progress", response_model=ProgressUpdateResponse)
async def update_reading_progress(
    book_id: UUID,
    request_data: ProgressUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProgressUpdateResponse:
    service = BookService(session)
    return await service.update_reading_progress(
        book_id=book_id,
        user_id=current_user.id,
        current_page=request_data.current_page,
    )


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = BookService(session)
    await service.delete_book(book_id=book_id, user_id=current_user.id)


@router.post("/{book_id}/upload", response_model=BookFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_book_file(
    book_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> BookFileResponse:
    service = FileUploadService(session)
    book_file = await service.upload_for_book(
        book_id=book_id,
        user=current_user,
        file=file,
    )
    return BookFileResponse.model_validate(book_file)


@router.get("/{book_id}/file")
async def get_book_file(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> FileResponse:
    service = FileUploadService(session)
    file_path, mime_type, original_name = await service.get_book_file(
        book_id=book_id,
        user=current_user,
    )
    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        filename=original_name,
    )


@router.delete("/{book_id}/file", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book_file(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = FileUploadService(session)
    await service.delete_book_file(
        book_id=book_id,
        user=current_user,
    )


@router.get("/{book_id}/reader/state", response_model=ReaderStateRead)
async def get_reader_state(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ReaderStateRead:
    service = ReaderService(session)
    state = await service.get_or_create_reader_state(book_id=book_id, user=current_user)
    return ReaderStateRead.model_validate(state)


@router.patch("/{book_id}/reader/progress", response_model=ReaderStateRead)
async def update_reader_progress(
    book_id: UUID,
    payload: ReaderProgressUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ReaderStateRead:
    service = ReaderService(session)
    state = await service.update_reader_progress(
        book_id=book_id, user=current_user, payload=payload
    )
    return ReaderStateRead.model_validate(state)

