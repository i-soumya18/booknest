from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.bookmark import BookmarkCreate, BookmarkResponse
from app.services.bookmark_service import BookmarkService

router = APIRouter(prefix="/books/{book_id}/bookmarks", tags=["Bookmarks"])


@router.get("", response_model=list[BookmarkResponse])
async def list_bookmarks(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[BookmarkResponse]:
    service = BookmarkService(session)
    bookmarks = await service.list_bookmarks(book_id=book_id, user=current_user)
    return [BookmarkResponse.model_validate(b) for b in bookmarks]


@router.post("", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    book_id: UUID,
    payload: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> BookmarkResponse:
    service = BookmarkService(session)
    bookmark = await service.create_bookmark(
        book_id=book_id, user=current_user, data=payload
    )
    return BookmarkResponse.model_validate(bookmark)


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    book_id: UUID,
    bookmark_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = BookmarkService(session)
    await service.delete_bookmark(bookmark_id=bookmark_id, user=current_user)
