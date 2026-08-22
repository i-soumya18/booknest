from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.activity import ActivityEventResponse


class ShelfHighlight(BaseModel):
    id: UUID
    name: str
    book_count: int

    model_config = ConfigDict(from_attributes=True)


class DashboardMetricsResponse(BaseModel):
    books_by_status: dict[str, int]
    books_finished_this_year: int
    average_rating: float | None
    shelf_with_most_books: ShelfHighlight | None
    books_currently_lent_out: int
    shelves_shared_with_user: int
    recent_activity: list[ActivityEventResponse]

    model_config = ConfigDict(from_attributes=True)
