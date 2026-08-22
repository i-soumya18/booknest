from collections.abc import Callable, Coroutine
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.events.events import DomainEvent
from app.models.activity import ActivityEvent

EventHandler = Callable[[AsyncSession, DomainEvent], Coroutine[Any, Any, None]]


class EventDispatcher:
    def __init__(self):
        self._handlers: list[EventHandler] = []

    def register(self, handler: EventHandler) -> None:
        if handler not in self._handlers:
            self._handlers.append(handler)

    async def publish(self, session: AsyncSession, event: DomainEvent) -> None:
        for handler in self._handlers:
            await handler(session, event)


event_dispatcher = EventDispatcher()


async def activity_log_handler(session: AsyncSession, event: DomainEvent) -> None:
    full_payload = {
        **event.payload,
        "actor_id": str(event.actor_id),
        "target_user_id": str(event.target_user_id) if event.target_user_id else None,
        "book_id": str(event.book_id) if event.book_id else None,
        "shelf_id": str(event.shelf_id) if event.shelf_id else None,
    }

    # Record activity for actor
    actor_activity = ActivityEvent(
        user_id=event.actor_id,
        event_type=event.event_type,
        entity_type=event.entity_type,
        entity_id=event.entity_id,
        payload=full_payload,
        created_at=event.timestamp,
    )
    session.add(actor_activity)

    # Record activity for target user if cross-user action
    if event.target_user_id and event.target_user_id != event.actor_id:
        target_activity = ActivityEvent(
            user_id=event.target_user_id,
            event_type=event.event_type,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            payload=full_payload,
            created_at=event.timestamp,
        )
        session.add(target_activity)


# Register built-in activity logging handler
event_dispatcher.register(activity_log_handler)
