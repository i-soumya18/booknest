from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ActivityEventResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_type: str
    entity_type: str
    entity_id: UUID
    payload: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
