from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4


@dataclass
class DomainEvent:
    event_type: str
    entity_type: str
    entity_id: UUID
    actor_id: UUID
    target_user_id: UUID | None = None
    book_id: UUID | None = None
    shelf_id: UUID | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    event_id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
