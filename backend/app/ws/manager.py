import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Room name -> set of WebSockets
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)
        # WebSocket -> user_id
        self.socket_user: dict[WebSocket, UUID] = {}
        # WebSocket -> set of authorized room names
        self.socket_rooms: dict[WebSocket, set[str]] = defaultdict(set)

    def connect(self, websocket: WebSocket, user_id: UUID, rooms: set[str]) -> None:
        self.socket_user[websocket] = user_id
        self.socket_rooms[websocket] = set(rooms)
        for room in rooms:
            self.rooms[room].add(websocket)
        logger.info(f"WebSocket connected for user {user_id} in rooms: {rooms}")

    def disconnect(self, websocket: WebSocket) -> None:
        user_id = self.socket_user.pop(websocket, None)
        rooms = self.socket_rooms.pop(websocket, set())
        for room in rooms:
            self.rooms[room].discard(websocket)
            if not self.rooms[room]:
                del self.rooms[room]
        logger.info(f"WebSocket disconnected for user {user_id}")

    def get_user_rooms(self, websocket: WebSocket) -> set[str]:
        return self.socket_rooms.get(websocket, set())

    def is_in_room(self, websocket: WebSocket, room: str) -> bool:
        return room in self.socket_rooms.get(websocket, set())

    async def send_to_room(self, room: str, message: dict[str, Any]) -> None:
        sockets = list(self.rooms.get(room, set()))
        for socket in sockets:
            try:
                await socket.send_json(message)
            except Exception as err:
                logger.warning(f"Error sending message to socket in room {room}: {err}")

    async def send_to_rooms(self, rooms: set[str], message: dict[str, Any]) -> None:
        target_sockets: set[WebSocket] = set()
        for room in rooms:
            target_sockets.update(self.rooms.get(room, set()))
        for socket in list(target_sockets):
            try:
                await socket.send_json(message)
            except Exception as err:
                logger.warning(f"Error sending message to socket: {err}")

    async def send_to_user(self, user_id: UUID, message: dict[str, Any]) -> None:
        await self.send_to_room(f"user:{user_id}", message)


connection_manager = ConnectionManager()
