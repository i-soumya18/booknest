import json

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.ws.auth import authenticate_ws_connection
from app.ws.manager import connection_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    # 1. Handshake authentication check
    auth_result = None
    if token:
        auth_result = await authenticate_ws_connection(token=token, session=session)

    if not auth_result:
        await websocket.accept()
        try:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            if data.get("type") == "authenticate" and data.get("token"):
                auth_result = await authenticate_ws_connection(token=data["token"], session=session)
        except Exception:
            pass

        if not auth_result:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": {
                        "code": "UNAUTHENTICATED",
                        "message": "Valid JWT token required for WebSocket connection",
                    },
                }
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    user, rooms = auth_result

    # Accept connection if not already accepted
    if websocket.client_state.name == "CONNECTING":
        await websocket.accept()

    # 2. Register connection with server-determined rooms
    connection_manager.connect(websocket, user.id, rooms)

    # 3. Send connected confirmation frame
    await websocket.send_json(
        {
            "type": "connected",
            "user_id": str(user.id),
            "rooms": sorted(list(rooms)),
        }
    )

    # 4. Message loop — rejecting client room join attempts
    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                msg_data = json.loads(raw_msg)
                msg_type = msg_data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg_type == "join_room":
                    await websocket.send_json(
                        {
                            "type": "error",
                            "error": {
                                "code": "CLIENT_ROOM_JOIN_NOT_ALLOWED",
                                "message": (
                                    "Room membership is determined by the server "
                                    "based on database authorization."
                                ),
                            },
                        }
                    )
                else:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "error": {
                                "code": "UNKNOWN_MESSAGE_TYPE",
                                "message": f"Unknown message type: {msg_type}",
                            },
                        }
                    )
            except json.JSONDecodeError:
                await websocket.send_json(
                    {
                        "type": "error",
                        "error": {
                            "code": "INVALID_JSON",
                            "message": "Message payload must be valid JSON",
                        },
                    }
                )
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
