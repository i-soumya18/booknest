from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.activity import ActivityEventResponse
from app.schemas.dashboard import DashboardMetricsResponse, ShelfHighlight


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.repo = DashboardRepository(session)

    async def get_dashboard_metrics(self, user_id: UUID) -> DashboardMetricsResponse:
        books_by_status = await self.repo.get_books_by_status(user_id)
        finished_this_year = await self.repo.get_books_finished_this_year(user_id)
        avg_rating = await self.repo.get_average_rating(user_id)
        top_shelf_data = await self.repo.get_shelf_with_most_books(user_id)
        lent_out_count = await self.repo.get_books_currently_lent_out(user_id)
        shared_shelves_count = await self.repo.get_shelves_shared_with_user(user_id)
        recent_activity_events = await self.repo.get_recent_activity(user_id, limit=10)

        shelf_highlight = (
            ShelfHighlight(
                id=top_shelf_data["id"],
                name=top_shelf_data["name"],
                book_count=top_shelf_data["book_count"],
            )
            if top_shelf_data
            else None
        )

        activity_responses = [
            ActivityEventResponse.model_validate(evt) for evt in recent_activity_events
        ]

        return DashboardMetricsResponse(
            books_by_status=books_by_status,
            books_finished_this_year=finished_this_year,
            average_rating=avg_rating,
            shelf_with_most_books=shelf_highlight,
            books_currently_lent_out=lent_out_count,
            shelves_shared_with_user=shared_shelves_count,
            recent_activity=activity_responses,
        )
