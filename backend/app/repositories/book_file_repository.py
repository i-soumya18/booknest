from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book_file import BookFile


class BookFileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_book_id(self, book_id: UUID) -> BookFile | None:
        stmt = select(BookFile).where(BookFile.book_id == book_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(
        self,
        book_id: UUID,
        original_name: str,
        stored_path: str,
        mime_type: str,
        file_size_bytes: int,
        page_count: int | None = None,
        cover_thumbnail: str | None = None,
        checksum_sha256: str | None = None,
    ) -> BookFile:
        book_file = BookFile(
            book_id=book_id,
            original_name=original_name,
            stored_path=stored_path,
            mime_type=mime_type,
            file_size_bytes=file_size_bytes,
            page_count=page_count,
            cover_thumbnail=cover_thumbnail,
            checksum_sha256=checksum_sha256,
        )
        self.session.add(book_file)
        await self.session.flush()
        await self.session.refresh(book_file)
        return book_file

    async def delete(self, book_file: BookFile) -> None:
        await self.session.delete(book_file)
        await self.session.flush()
