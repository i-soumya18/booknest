import hashlib
import os
import uuid
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.events.dispatcher import event_dispatcher
from app.events.events import DomainEvent
from app.models.book import Book
from app.models.book_file import BookFile
from app.models.user import User
from app.repositories.book_file_repository import BookFileRepository
from app.repositories.book_repository import BookRepository
from app.repositories.lending_repository import LendingRepository
from app.schemas.book import BookCreateRequest, BookStatusEnum
from app.storage.backend import get_storage_backend
from app.storage.metadata import detect_mime_type_from_bytes, extract_metadata


class FileUploadService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.book_repo = BookRepository(session)
        self.book_file_repo = BookFileRepository(session)
        self.lending_repo = LendingRepository(session)
        self.storage_backend = get_storage_backend()
        self.settings = get_settings()

    def _is_admin(self, user: User) -> bool:
        return user.email.lower() == self.settings.admin_email.lower()

    async def _check_file_access(self, book: Book, user: User, write: bool = False) -> None:
        """Check if user has permission to access (read or write) the book's file."""
        if self._is_admin(user):
            return

        if book.owner_id == user.id:
            return

        # Check if borrower
        active_lending = await self.lending_repo.get_active_lending_by_book(book.id)
        if active_lending and active_lending.borrower_id == user.id:
            if write:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": {
                            "code": "BORROWED_BOOK_READ_ONLY",
                            "message": "Borrowers have read-only access and cannot modify files",
                        }
                    },
                )
            return  # Borrower can read/download

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have access to this book's file",
                }
            },
        )

    async def upload_for_book(self, book_id: UUID, user: User, file: UploadFile) -> BookFile:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        # Ensure write access (owner or admin)
        await self._check_file_access(book, user, write=True)

        # Read file
        contents = await file.read()
        max_bytes = self.settings.max_upload_size_mb * 1024 * 1024
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail={
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": f"File size exceeds maximum allowed size of {self.settings.max_upload_size_mb}MB",
                    }
                },
            )

        # Validate magic bytes
        detected_mime = detect_mime_type_from_bytes(contents)
        if not detected_mime or detected_mime not in ("application/pdf", "application/epub+zip"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "error": {
                        "code": "UNSUPPORTED_FILE_TYPE",
                        "message": "Only PDF and EPUB files are supported. File magic bytes did not match a valid format.",
                    }
                },
            )

        # Extract metadata
        metadata = extract_metadata(contents, detected_mime)
        checksum = hashlib.sha256(contents).hexdigest()

        # Sanitize filename & determine extension
        orig_name = os.path.basename(file.filename or "uploaded_book")
        ext = ".pdf" if detected_mime == "application/pdf" else ".epub"
        destination_rel_path = f"books/{book.id}/{uuid.uuid4()}{ext}"

        # If a file already exists for this book, clean it up
        existing_file = await self.book_file_repo.get_by_book_id(book.id)
        if existing_file:
            await self.storage_backend.delete(existing_file.stored_path)
            await self.book_file_repo.delete(existing_file)

        # Save to storage
        stored_path = await self.storage_backend.save(contents, destination_rel_path)

        # Create book_file record
        book_file = await self.book_file_repo.create(
            book_id=book.id,
            original_name=orig_name,
            stored_path=stored_path,
            mime_type=detected_mime,
            file_size_bytes=len(contents),
            page_count=metadata.get("page_count"),
            cover_thumbnail=None,
            checksum_sha256=checksum,
        )

        # Auto-update book page count if available and book total_pages was not manually customized
        if metadata.get("page_count") and metadata["page_count"] > 0:
            if book.total_pages <= 1 or book.current_page == 0:
                book.total_pages = metadata["page_count"]
                self.session.add(book)
                await self.session.flush()

        await event_dispatcher.publish(
            self.session,
            DomainEvent(
                event_type="BOOK_FILE_UPLOADED",
                entity_type="book",
                entity_id=book.id,
                actor_id=user.id,
                book_id=book.id,
                payload={
                    "filename": orig_name,
                    "mime_type": detected_mime,
                    "size": len(contents),
                    "page_count": metadata.get("page_count"),
                },
            ),
        )

        await self.session.commit()
        await self.session.refresh(book_file)
        return book_file

    async def upload_first(
        self,
        user: User,
        file: UploadFile,
        title: str | None = None,
        author: str | None = None,
    ) -> Book:
        contents = await file.read()
        max_bytes = self.settings.max_upload_size_mb * 1024 * 1024
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail={
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": f"File size exceeds maximum allowed size of {self.settings.max_upload_size_mb}MB",
                    }
                },
            )

        detected_mime = detect_mime_type_from_bytes(contents)
        if not detected_mime or detected_mime not in ("application/pdf", "application/epub+zip"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "error": {
                        "code": "UNSUPPORTED_FILE_TYPE",
                        "message": "Only PDF and EPUB files are supported.",
                    }
                },
            )

        metadata = extract_metadata(contents, detected_mime)
        checksum = hashlib.sha256(contents).hexdigest()

        orig_name = os.path.basename(file.filename or "uploaded_book")
        clean_name, _ = os.path.splitext(orig_name)

        final_title = title.strip() if (title and title.strip()) else (metadata.get("title") or clean_name or "Untitled Book")
        final_author = author.strip() if (author and author.strip()) else (metadata.get("author") or "Unknown Author")
        page_count = metadata.get("page_count") or 1

        book_create = BookCreateRequest(
            title=final_title[:255],
            author=final_author[:255],
            status=BookStatusEnum.WANT_TO_READ,
            total_pages=max(1, page_count),
            current_page=0,
        )

        book = await self.book_repo.create_book(owner_id=user.id, data=book_create)

        ext = ".pdf" if detected_mime == "application/pdf" else ".epub"
        destination_rel_path = f"books/{book.id}/{uuid.uuid4()}{ext}"
        stored_path = await self.storage_backend.save(contents, destination_rel_path)

        await self.book_file_repo.create(
            book_id=book.id,
            original_name=orig_name,
            stored_path=stored_path,
            mime_type=detected_mime,
            file_size_bytes=len(contents),
            page_count=metadata.get("page_count"),
            checksum_sha256=checksum,
        )

        await event_dispatcher.publish(
            self.session,
            DomainEvent(
                event_type="BOOK_ADDED",
                entity_type="book",
                entity_id=book.id,
                actor_id=user.id,
                book_id=book.id,
                payload={"title": book.title, "author": book.author, "status": book.status},
            ),
        )

        await self.session.commit()
        fresh_book = await self.book_repo.get_by_id(book.id)
        return fresh_book or book

    async def get_book_file(self, book_id: UUID, user: User) -> tuple[Path, str, str]:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        # Check read access (owner, active borrower, or admin)
        await self._check_file_access(book, user, write=False)

        book_file = await self.book_file_repo.get_by_book_id(book_id)
        if not book_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "FILE_NOT_FOUND", "message": "No file uploaded for this book"}},
            )

        file_path = self.storage_backend.get_path(book_file.stored_path)
        if not file_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "FILE_NOT_FOUND", "message": "File not found on storage"}},
            )

        return file_path, book_file.mime_type, book_file.original_name

    async def delete_book_file(self, book_id: UUID, user: User) -> None:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "BOOK_NOT_FOUND", "message": "Book not found"}},
            )

        # Check write access (owner or admin)
        await self._check_file_access(book, user, write=True)

        book_file = await self.book_file_repo.get_by_book_id(book_id)
        if not book_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "FILE_NOT_FOUND", "message": "No file attached to this book"}},
            )

        await self.storage_backend.delete(book_file.stored_path)
        await self.book_file_repo.delete(book_file)

        await event_dispatcher.publish(
            self.session,
            DomainEvent(
                event_type="BOOK_FILE_DELETED",
                entity_type="book",
                entity_id=book.id,
                actor_id=user.id,
                book_id=book.id,
                payload={"book_id": str(book.id)},
            ),
        )
        await self.session.commit()

