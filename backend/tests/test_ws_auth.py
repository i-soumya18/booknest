from starlette.websockets import WebSocketDisconnect


def _create_user_and_login(client, email: str, name: str) -> tuple[str, str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    user_id = signup_resp.json()["user"]["id"]
    return access_token, user_id


def test_unauthenticated_ws_connection_rejected(client):
    try:
        with client.websocket_connect("/api/v1/ws"):
            pass
    except WebSocketDisconnect as e:
        assert e.code == 1008

    try:
        with client.websocket_connect("/api/v1/ws?token=invalid_token_123"):
            pass
    except WebSocketDisconnect as e:
        assert e.code == 1008


def test_authenticated_ws_connection_joins_authorized_rooms(client):
    token_a, user_a_id = _create_user_and_login(client, "wsa@example.com", "WS User A")

    # Create owned shelf for User A
    headers_a = {"Authorization": f"Bearer {token_a}"}
    shelf_resp = client.post("/api/v1/shelves", headers=headers_a, json={"name": "User A Shelf"})
    assert shelf_resp.status_code == 201
    shelf_a_id = shelf_resp.json()["id"]

    # Connect to WS with token A
    with client.websocket_connect(f"/api/v1/ws?token={token_a}") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connected"
        assert data["user_id"] == user_a_id
        rooms = data["rooms"]
        assert f"user:{user_a_id}" in rooms
        assert f"shelf:{shelf_a_id}" in rooms


def test_shared_shelf_room_joined_and_unrelated_isolated(client):
    token_owner, owner_id = _create_user_and_login(client, "wsowner@example.com", "WS Owner")
    token_collab, collab_id = _create_user_and_login(client, "wscollab@example.com", "WS Collab")
    token_stranger, stranger_id = _create_user_and_login(
        client, "wsstranger@example.com", "WS Stranger"
    )

    headers_owner = {"Authorization": f"Bearer {token_owner}"}
    shelf_resp = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Collaborative Shelf"}
    )
    shelf_id = shelf_resp.json()["id"]

    # Share shelf with collab user
    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "wscollab@example.com", "role": "EDITOR"},
    )

    # Collab connects: should join personal room and shared shelf room
    with client.websocket_connect(f"/api/v1/ws?token={token_collab}") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connected"
        rooms = data["rooms"]
        assert f"user:{collab_id}" in rooms
        assert f"shelf:{shelf_id}" in rooms

    # Stranger connects: should join personal room, but NOT shared shelf room
    with client.websocket_connect(f"/api/v1/ws?token={token_stranger}") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connected"
        rooms = data["rooms"]
        assert f"user:{stranger_id}" in rooms
        assert f"shelf:{shelf_id}" not in rooms


def test_client_room_join_rejected(client):
    token_a, user_a_id = _create_user_and_login(client, "wsjoin@example.com", "WS Join Test")

    with client.websocket_connect(f"/api/v1/ws?token={token_a}") as websocket:
        connected_frame = websocket.receive_json()
        assert connected_frame["type"] == "connected"

        # Client tries to join a room directly
        websocket.send_json({"type": "join_room", "room": "shelf:fake-id-123"})
        resp = websocket.receive_json()
        assert resp["type"] == "error"
        assert resp["error"]["code"] == "CLIENT_ROOM_JOIN_NOT_ALLOWED"
