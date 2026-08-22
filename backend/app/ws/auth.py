from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decode_access_token
from app.models.user import User
from app.repositories.shelf_repository import ShelfRepository
from app.repositories.user_repository import UserRepository


async def authenticate_ws_connection(
    token: str, session: AsyncSession
) -> tuple[User, set[str]] | None:
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    try:
        user_id = UUID(payload["sub"])
    except ValueError:
        return None

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(user_id)
    if not user:
        return None

    # Server-determined room membership
    rooms: set[str] = {f"user:{user.id}"}

    shelf_repo = ShelfRepository(session)

    # Owned shelves
    owned_shelves = await shelf_repo.get_by_owner(owner_id=user.id)
    for s in owned_shelves:
        rooms.add(f"shelf:{s.id}")

    # Shared collaborator shelves
    shared_shelves = await shelf_repo.get_shared_shelves_for_user(user_id=user.id)
    for s, _role in shared_shelves:
        rooms.add(f"shelf:{s.id}")

    return user, rooms
