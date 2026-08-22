def _create_user_and_login(client, email: str, name: str) -> tuple[str, str, dict[str, str]]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    user_id = signup_resp.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return access_token, user_id, headers


def test_lending_events_routed_to_borrower_ws(client):
    token_owner, owner_id, headers_owner = _create_user_and_login(
        client, "lowner@example.com", "Lend Owner"
    )
    token_borrower, borrower_id, headers_borrower = _create_user_and_login(
        client, "lborrower@example.com", "Lend Borrower"
    )

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Realtime Lending Book",
            "author": "Author RL",
            "status": "READING",
            "total_pages": 200,
        },
    )
    book_id = b_resp.json()["id"]

    # Connect borrower WebSocket
    with client.websocket_connect(f"/api/v1/ws?token={token_borrower}") as ws_borrower:
        conn_frame = ws_borrower.receive_json()
        assert conn_frame["type"] == "connected"

        # Owner lends book to borrower via REST API
        lend_resp = client.post(
            f"/api/v1/books/{book_id}/lend",
            headers=headers_owner,
            json={"borrower_id": borrower_id},
        )
        assert lend_resp.status_code == 201

        # Borrower receives live BOOK_LENT event frame over WebSocket
        event_frame = ws_borrower.receive_json()
        assert event_frame["type"] == "domain_event"
        evt = event_frame["event"]
        assert evt["event_type"] == "BOOK_LENT"
        assert evt["book_id"] == book_id
        assert evt["target_user_id"] == borrower_id

        # Owner returns book via REST API
        ret_resp = client.post(f"/api/v1/books/{book_id}/return", headers=headers_owner)
        assert ret_resp.status_code == 200

        # Borrower receives live BOOK_RETURNED event frame over WebSocket
        ret_frame = ws_borrower.receive_json()
        assert ret_frame["type"] == "domain_event"
        ret_evt = ret_frame["event"]
        assert ret_evt["event_type"] == "BOOK_RETURNED"
        assert ret_evt["book_id"] == book_id


def test_shared_shelf_events_routed_to_collaborators(client):
    token_owner, owner_id, headers_owner = _create_user_and_login(
        client, "sowner@example.com", "Shelf Owner"
    )
    token_editor, editor_id, headers_editor = _create_user_and_login(
        client, "seditor@example.com", "Shelf Editor"
    )

    # Create shelf & add editor
    shelf_resp = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Shared Realtime Shelf"}
    )
    shelf_id = shelf_resp.json()["id"]

    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "seditor@example.com", "role": "EDITOR"},
    )

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Shared Shelf Book",
            "author": "Author SS",
            "status": "READING",
            "total_pages": 300,
        },
    )
    book_id = b_resp.json()["id"]

    # Connect editor to WS (editor joins shelf:{shelf_id})
    with client.websocket_connect(f"/api/v1/ws?token={token_editor}") as ws_editor:
        conn_frame = ws_editor.receive_json()
        assert f"shelf:{shelf_id}" in conn_frame["rooms"]

        # Owner adds book to shelf via REST
        client.post(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_owner)

        # Editor receives live BOOK_ADDED_TO_SHELF event
        event_frame = ws_editor.receive_json()
        assert event_frame["type"] == "domain_event"
        evt = event_frame["event"]
        assert evt["event_type"] == "BOOK_ADDED_TO_SHELF"
        assert evt["shelf_id"] == shelf_id
        assert evt["book_id"] == book_id


def test_unrelated_user_receives_no_events_security(client):
    token_owner, owner_id, headers_owner = _create_user_and_login(
        client, "powner@example.com", "Private Owner"
    )
    token_stranger, stranger_id, headers_stranger = _create_user_and_login(
        client, "pstranger@example.com", "Private Stranger"
    )

    # Private shelf & book
    shelf_resp = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Private Secret Shelf"}
    )
    shelf_id = shelf_resp.json()["id"]

    b_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Private Secret Book",
            "author": "Author P",
            "status": "READING",
            "total_pages": 150,
        },
    )
    book_id = b_resp.json()["id"]

    # Connect stranger to WS
    with client.websocket_connect(f"/api/v1/ws?token={token_stranger}") as ws_stranger:
        conn_frame = ws_stranger.receive_json()
        assert f"shelf:{shelf_id}" not in conn_frame["rooms"]

        # Owner performs operations on private shelf
        client.post(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_owner)

        # Stranger sends ping/pong to confirm socket is open and no leaked events were received
        ws_stranger.send_json({"type": "ping"})
        pong_frame = ws_stranger.receive_json()
        # Should be pong frame, NOT a leaked domain_event!
        assert pong_frame["type"] == "pong"
