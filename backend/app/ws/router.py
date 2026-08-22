import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.events.dispatcher import event_dispatcher
from app.events.events import DomainEvent
from app.ws.manager import connection_manager

logger = logging.getLogger(__name__)


async def websocket_router_handler(session: AsyncSession, event: DomainEvent) -> None:
    try:
        target_rooms: set[str] = set()

        # Always include actor room
        if event.actor_id:
            target_rooms.add(f"user:{event.actor_id}")

        # Include target user room (for lending / collaborator events)
        if event.target_user_id:
            target_rooms.add(f"user:{event.target_user_id}")

        # Include shelf room (for shelf updates / shelf book changes / collaborator changes)
        if event.shelf_id:
            target_rooms.add(f"shelf:{event.shelf_id}")

        ws_payload: dict[str, Any] = {
            "type": "domain_event",
            "event": {
                "event_id": str(event.event_id),
                "event_type": event.event_type,
                "entity_type": event.entity_type,
                "entity_id": str(event.entity_id),
                "actor_id": str(event.actor_id),
                "target_user_id": str(event.target_user_id) if event.target_user_id else None,
                "book_id": str(event.book_id) if event.book_id else None,
                "shelf_id": str(event.shelf_id) if event.shelf_id else None,
                "payload": event.payload,
                "timestamp": event.timestamp.isoformat(),
            },
        }

        await connection_manager.send_to_rooms(target_rooms, ws_payload)
    except Exception as err:
        logger.warning(f"Error routing WebSocket event {event.event_type}: {err}")


# Register WebSocket router handler with central Domain Event Dispatcher
event_dispatcher.register(websocket_router_handler)
