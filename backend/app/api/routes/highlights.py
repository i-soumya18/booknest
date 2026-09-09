from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.highlight import (
    AnnotationCreate,
    AnnotationResponse,
    AnnotationUpdate,
    HighlightCreate,
    HighlightResponse,
    HighlightUpdate,
)
from app.services.annotation_service import AnnotationService

router = APIRouter(prefix="/books/{book_id}/highlights", tags=["Highlights & Annotations"])


@router.get("", response_model=list[HighlightResponse])
async def list_highlights(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[HighlightResponse]:
    service = AnnotationService(session)
    highlights = await service.list_highlights(book_id=book_id, user=current_user)
    return [HighlightResponse.model_validate(h) for h in highlights]


@router.post("", response_model=HighlightResponse, status_code=status.HTTP_201_CREATED)
async def create_highlight(
    book_id: UUID,
    payload: HighlightCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> HighlightResponse:
    service = AnnotationService(session)
    highlight = await service.create_highlight(
        book_id=book_id, user=current_user, data=payload
    )
    return HighlightResponse.model_validate(highlight)


@router.patch("/{highlight_id}", response_model=HighlightResponse)
async def update_highlight(
    book_id: UUID,
    highlight_id: UUID,
    payload: HighlightUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> HighlightResponse:
    service = AnnotationService(session)
    highlight = await service.update_highlight(
        highlight_id=highlight_id, user=current_user, data=payload
    )
    return HighlightResponse.model_validate(highlight)


@router.delete("/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_highlight(
    book_id: UUID,
    highlight_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = AnnotationService(session)
    await service.delete_highlight(highlight_id=highlight_id, user=current_user)


@router.post(
    "/{highlight_id}/annotations",
    response_model=AnnotationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_annotation(
    book_id: UUID,
    highlight_id: UUID,
    payload: AnnotationCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AnnotationResponse:
    service = AnnotationService(session)
    annotation = await service.add_annotation(
        highlight_id=highlight_id, user=current_user, data=payload
    )
    return AnnotationResponse.model_validate(annotation)


@router.patch(
    "/{highlight_id}/annotations/{annotation_id}",
    response_model=AnnotationResponse,
)
async def update_annotation(
    book_id: UUID,
    highlight_id: UUID,
    annotation_id: UUID,
    payload: AnnotationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AnnotationResponse:
    service = AnnotationService(session)
    annotation = await service.update_annotation(
        annotation_id=annotation_id, user=current_user, data=payload
    )
    return AnnotationResponse.model_validate(annotation)


@router.delete(
    "/{highlight_id}/annotations/{annotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_annotation(
    book_id: UUID,
    highlight_id: UUID,
    annotation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = AnnotationService(session)
    await service.delete_annotation(annotation_id=annotation_id, user=current_user)
