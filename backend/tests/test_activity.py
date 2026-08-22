def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


def test_book_added_emits_activity(client):
    headers, _ = _create_user_and_login(client, "act_user1@example.com", "Act User 1")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Activity Test Book",
            "author": "Author A",
            "status": "WANT_TO_READ",
            "total_pages": 300,
        },
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    # Fetch activity
    act_resp = client.get("/api/v1/activity", headers=headers)
    assert act_resp.status_code == 200
    data = act_resp.json()
    assert data["total"] >= 1
    event = data["items"][0]
    assert event["event_type"] == "BOOK_ADDED"
    assert event["entity_type"] == "book"
    assert event["entity_id"] == book_id
    assert event["payload"]["title"] == "Activity Test Book"


def test_reading_progress_and_status_changed_emits_activity(client):
    headers, _ = _create_user_and_login(client, "act_user2@example.com", "Act User 2")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Progress Book",
            "author": "Author P",
            "status": "READING",
            "total_pages": 100,
        },
    )
    book_id = b_resp.json()["id"]

    # Update progress to 100 (auto-finish)
    prog_resp = client.patch(
        f"/api/v1/books/{book_id}/progress",
        headers=headers,
        json={"current_page": 100},
    )
    assert prog_resp.status_code == 200

    act_resp = client.get("/api/v1/activity", headers=headers)
    assert act_resp.status_code == 200
    events = act_resp.json()["items"]
    event_types = [e["event_type"] for e in events]
    assert "BOOK_PROGRESS_UPDATED" in event_types
    assert "BOOK_STATUS_CHANGED" in event_types


def test_shelf_created_and_deleted_emits_activity(client):
    headers, _ = _create_user_and_login(client, "act_user3@example.com", "Act User 3")

    s_resp = client.post("/api/v1/shelves", headers=headers, json={"name": "Sci-Fi"})
    assert s_resp.status_code == 201
    shelf_id = s_resp.json()["id"]

    client.delete(f"/api/v1/shelves/{shelf_id}", headers=headers)

    act_resp = client.get("/api/v1/activity", headers=headers)
    assert act_resp.status_code == 200
    event_types = [e["event_type"] for e in act_resp.json()["items"]]
    assert "SHELF_CREATED" in event_types
    assert "SHELF_DELETED" in event_types


def test_shelf_book_added_and_removed_emits_activity(client):
    headers, _ = _create_user_and_login(client, "act_user4@example.com", "Act User 4")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Dune", "author": "Frank Herbert", "status": "READING", "total_pages": 400},
    )
    book_id = b_resp.json()["id"]

    s_resp = client.post("/api/v1/shelves", headers=headers, json={"name": "Favorites"})
    shelf_id = s_resp.json()["id"]

    client.post(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers)
    client.delete(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers)

    act_resp = client.get("/api/v1/activity", headers=headers)
    assert act_resp.status_code == 200
    event_types = [e["event_type"] for e in act_resp.json()["items"]]
    assert "BOOK_ADDED_TO_SHELF" in event_types
    assert "BOOK_REMOVED_FROM_SHELF" in event_types


def test_shelf_shared_and_collaborator_managed_emits_activity(client):
    headers_owner, _ = _create_user_and_login(client, "act_owner5@example.com", "Owner 5")
    headers_collab, collab_id = _create_user_and_login(
        client, "act_collab5@example.com", "Collab 5"
    )

    s_resp = client.post("/api/v1/shelves", headers=headers_owner, json={"name": "Shared Shelf"})
    shelf_id = s_resp.json()["id"]

    # Share shelf
    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "act_collab5@example.com", "role": "EDITOR"},
    )

    # Update role
    client.put(
        f"/api/v1/shelves/{shelf_id}/collaborators/{collab_id}",
        headers=headers_owner,
        json={"role": "VIEWER"},
    )

    # Remove collaborator
    client.delete(f"/api/v1/shelves/{shelf_id}/collaborators/{collab_id}", headers=headers_owner)

    # Check owner activity feed
    act_owner = client.get("/api/v1/activity", headers=headers_owner).json()
    owner_types = [e["event_type"] for e in act_owner["items"]]
    assert "SHELF_SHARED" in owner_types
    assert "COLLABORATOR_ROLE_CHANGED" in owner_types
    assert "COLLABORATOR_REMOVED" in owner_types

    # Check recipient collaborator activity feed
    act_collab = client.get("/api/v1/activity", headers=headers_collab).json()
    collab_types = [e["event_type"] for e in act_collab["items"]]
    assert "SHELF_SHARED" in collab_types
    assert "COLLABORATOR_ROLE_CHANGED" in collab_types
    assert "COLLABORATOR_REMOVED" in collab_types


def test_book_lent_and_returned_emits_activity(client):
    headers_owner, _ = _create_user_and_login(client, "act_owner6@example.com", "Owner 6")
    headers_borrower, borrower_id = _create_user_and_login(
        client, "act_borrower6@example.com", "Borrower 6"
    )

    b_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Lending Event Book",
            "author": "Author L",
            "status": "READING",
            "total_pages": 200,
        },
    )
    book_id = b_resp.json()["id"]

    # Lend book
    client.post(
        f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": borrower_id}
    )

    # Return book
    client.post(f"/api/v1/books/{book_id}/return", headers=headers_owner)

    # Owner feed
    act_owner = client.get("/api/v1/activity", headers=headers_owner).json()
    o_types = [e["event_type"] for e in act_owner["items"]]
    assert "BOOK_LENT" in o_types
    assert "BOOK_RETURNED" in o_types

    # Borrower feed
    act_borrower = client.get("/api/v1/activity", headers=headers_borrower).json()
    b_types = [e["event_type"] for e in act_borrower["items"]]
    assert "BOOK_LENT" in b_types
    assert "BOOK_RETURNED" in b_types
