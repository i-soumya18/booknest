import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.dispatcher import event_dispatcher
from app.events.events import DomainEvent
from app.repositories.book_repository import BookRepository
from app.repositories.lending_repository import LendingRepository
from app.repositories.user_repository import UserRepository
from app.schemas.book import BookResponse, PaginatedResponse
from app.schemas.lending import BorrowedBookResponse, LendBookRequest, LendingResponse


class LendingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.book_repo = BookRepository(session)
        self.user_repo = UserRepository(session)
        self.lending_repo = LendingRepository(session)

    async def lend_book(
        self, book_id: UUID, owner_id: UUID, data: LendBookRequest
    ) -> LendingResponse:
        # 1. Verify ownership
        book = await self.book_repo.get_by_id(book_id)
        if not book or book.owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        # 2. Verify borrower exists
        borrower = None
        if data.borrower_id:
            borrower = await self.user_repo.get_by_id(data.borrower_id)
        elif data.borrower_email:
            borrower = await self.user_repo.get_by_email(data.borrower_email.strip())

        if not borrower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BORROWER_NOT_FOUND", "message": "Borrower not found"}},
            )

        # 3. Verify borrower != owner
        if borrower.id == owner_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "SELF_LENDING_NOT_ALLOWED",
                        "message": "Cannot lend a book to yourself",
                    }
                },
            )

        # 4. Verify no active lending
        active_lending = await self.lending_repo.get_active_lending_by_book(book_id)
        if active_lending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "BOOK_ALREADY_LENT",
                        "message": "Book is already lent out",
                    }
                },
            )

        # 5. Create lending with DB unique index protection
        try:
            lending = await self.lending_repo.create_lending(
                book_id=book_id,
                owner_id=owner_id,
                borrower_id=borrower.id,
                due_at=data.due_at,
            )
            await event_dispatcher.publish(
                self.session,
                DomainEvent(
                    event_type="BOOK_LENT",
                    entity_type="lending",
                    entity_id=lending.id,
                    actor_id=owner_id,
                    target_user_id=borrower.id,
                    book_id=book.id,
                    payload={
                        "book_title": book.title,
                        "borrower_name": borrower.name,
                        "borrower_email": borrower.email,
                    },
                ),
            )
            await self.session.commit()
            await self.session.refresh(lending)
            return LendingResponse.model_validate(lending)
        except IntegrityError as err:
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "BOOK_ALREADY_LENT",
                        "message": "Book is already lent out",
                    }
                },
            ) from err

    async def return_book(self, book_id: UUID, owner_id: UUID) -> LendingResponse:
        # 1. Verify ownership
        book = await self.book_repo.get_by_id(book_id)
        if not book or book.owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        # 2. Verify active lending
        active_lending = await self.lending_repo.get_active_lending_by_book(book_id)
        if not active_lending:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "NO_ACTIVE_LENDING",
                        "message": "Book is not currently lent out",
                    }
                },
            )

        # 3. Close lending
        closed_lending = await self.lending_repo.close_lending(active_lending)
        await event_dispatcher.publish(
            self.session,
            DomainEvent(
                event_type="BOOK_RETURNED",
                entity_type="lending",
                entity_id=closed_lending.id,
                actor_id=owner_id,
                target_user_id=closed_lending.borrower_id,
                book_id=book.id,
                payload={"book_title": book.title},
            ),
        )
        await self.session.commit()
        await self.session.refresh(closed_lending)
        return LendingResponse.model_validate(closed_lending)

    async def list_borrowed_books(
        self, borrower_id: UUID, page: int = 1, page_size: int = 20
    ) -> PaginatedResponse[BorrowedBookResponse]:
        lendings, total = await self.lending_repo.get_borrowed_by_user(
            borrower_id=borrower_id, page=page, page_size=page_size
        )

        items: list[BorrowedBookResponse] = []
        for lending in lendings:
            items.append(
                BorrowedBookResponse(
                    lending_id=lending.id,
                    book=BookResponse.model_validate(lending.book),
                    owner_id=lending.owner.id,
                    owner_name=lending.owner.name,
                    owner_email=lending.owner.email,
                    borrowed_at=lending.borrowed_at,
                    due_at=lending.due_at,
                )
            )

        total_pages = math.ceil(total / page_size) if total > 0 else 0

        return PaginatedResponse[BorrowedBookResponse](
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )
