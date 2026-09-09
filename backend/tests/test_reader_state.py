def _create_user(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    token = signup_resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}, signup_resp.json()["user"]["id"]


def test_get_reader_state_creates_initial_state(client):
    headers, user_id = _create_user(client, "reader_owner1@example.com", "Reader Owner 1")

    # Create a book
    book_res = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Reader Book", "author": "Author One", "total_pages": 120},
    )
    assert book_res.status_code == 201
    book_id = book_res.json()["id"]

    # Get reader state
    state_res = client.get(
        f"/api/v1/books/{book_id}/reader/state",
        headers=headers,
    )
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert state_data["book_id"] == book_id
    assert state_data["user_id"] == user_id
    assert state_data["current_page"] == 1
    assert state_data["zoom_level"] == 1.0
    assert state_data["theme"] == "light"
    assert state_data["focus_mode"] is False
    assert state_data["eye_safety_mode"] is False


def test_update_reader_progress_syncs_v1_reading_progress(client):
    headers, _ = _create_user(client, "reader_owner2@example.com", "Reader Owner 2")

    # Create a book (status: WANT_TO_READ)
    book_res = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Sync Book", "author": "Author One", "total_pages": 200},
    )
    book_id = book_res.json()["id"]
    assert book_res.json()["status"] == "WANT_TO_READ"

    # Update reader progress
    patch_res = client.patch(
        f"/api/v1/books/{book_id}/reader/progress",
        headers=headers,
        json={"current_page": 45, "theme": "sepia", "zoom_level": 1.25},
    )
    assert patch_res.status_code == 200
    updated_state = patch_res.json()
    assert updated_state["current_page"] == 45
    assert updated_state["theme"] == "sepia"
    assert updated_state["zoom_level"] == 1.25

    # Verify book record was updated to READING with current_page = 45
    get_book_res = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert get_book_res.status_code == 200
    book_data = get_book_res.json()
    assert book_data["current_page"] == 45
    assert book_data["status"] == "READING"


def test_update_reader_progress_auto_finish_on_last_page(client):
    headers, _ = _create_user(client, "reader_owner3@example.com", "Reader Owner 3")

    # Create a book
    book_res = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Finish Book", "author": "Author One", "total_pages": 50},
    )
    book_id = book_res.json()["id"]

    # Update reader progress to last page (50)
    patch_res = client.patch(
        f"/api/v1/books/{book_id}/reader/progress",
        headers=headers,
        json={"current_page": 50},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["current_page"] == 50

    # Verify book status transitioned to FINISHED
    get_book_res = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert get_book_res.status_code == 200
    assert get_book_res.json()["status"] == "FINISHED"
    assert get_book_res.json()["current_page"] == 50


def test_reader_preferences_persistence(client):
    headers, _ = _create_user(client, "reader_owner4@example.com", "Reader Owner 4")

    book_res = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Pref Book", "author": "Author", "total_pages": 100},
    )
    book_id = book_res.json()["id"]

    # Update all preferences
    patch_res = client.patch(
        f"/api/v1/books/{book_id}/reader/progress",
        headers=headers,
        json={
            "current_position": "epubcfi(/6/4[chap01]!/4/2/10)",
            "scroll_position": 240.5,
            "zoom_level": 1.5,
            "theme": "dark",
            "font_size": 20,
            "focus_mode": True,
            "eye_safety_mode": True,
        },
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["current_position"] == "epubcfi(/6/4[chap01]!/4/2/10)"
    assert data["scroll_position"] == 240.5
    assert data["zoom_level"] == 1.5
    assert data["theme"] == "dark"
    assert data["font_size"] == 20
    assert data["focus_mode"] is True
    assert data["eye_safety_mode"] is True

    # Re-fetch reader state and verify it opens at saved position and prefs
    fetch_res = client.get(f"/api/v1/books/{book_id}/reader/state", headers=headers)
    assert fetch_res.status_code == 200
    fetched_data = fetch_res.json()
    assert fetched_data["current_position"] == "epubcfi(/6/4[chap01]!/4/2/10)"
    assert fetched_data["theme"] == "dark"
    assert fetched_data["font_size"] == 20
    assert fetched_data["focus_mode"] is True
    assert fetched_data["eye_safety_mode"] is True


def test_reader_state_cross_user_isolation(client):
    owner_headers, _ = _create_user(client, "reader_owner5@example.com", "Owner 5")
    other_headers, _ = _create_user(client, "reader_other5@example.com", "Other 5")

    # User 1 creates book
    book_res = client.post(
        "/api/v1/books",
        headers=owner_headers,
        json={"title": "Private Book", "author": "Author", "total_pages": 100},
    )
    book_id = book_res.json()["id"]

    # User 2 attempts to get reader state without being borrower
    state_res = client.get(
        f"/api/v1/books/{book_id}/reader/state",
        headers=other_headers,
    )
    assert state_res.status_code == 403
    assert state_res.json()["detail"]["error"]["code"] == "FORBIDDEN"

    # User 2 attempts to update progress
    patch_res = client.patch(
        f"/api/v1/books/{book_id}/reader/progress",
        headers=other_headers,
        json={"current_page": 10},
    )
    assert patch_res.status_code == 403


def test_borrower_has_independent_reader_state(client):
    owner_headers, _ = _create_user(client, "reader_owner6@example.com", "Owner 6")
    borrower_headers, borrower_id = _create_user(client, "reader_borrower6@example.com", "Borrower 6")

    # User 1 creates book
    book_res = client.post(
        "/api/v1/books",
        headers=owner_headers,
        json={"title": "Shared Book", "author": "Author", "total_pages": 100},
    )
    book_id = book_res.json()["id"]

    # Lend book to borrower
    lend_res = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=owner_headers,
        json={"borrower_id": borrower_id},
    )
    assert lend_res.status_code == 201

    # Borrower gets reader state
    borrower_state_res = client.get(
        f"/api/v1/books/{book_id}/reader/state",
        headers=borrower_headers,
    )
    assert borrower_state_res.status_code == 200
    assert borrower_state_res.json()["user_id"] == borrower_id

    # Borrower updates reader state
    borrower_patch = client.patch(
        f"/api/v1/books/{book_id}/reader/progress",
        headers=borrower_headers,
        json={"current_page": 25, "theme": "dark"},
    )
    assert borrower_patch.status_code == 200
    assert borrower_patch.json()["current_page"] == 25

    # Owner's book current_page is NOT modified by borrower
    book_check = client.get(f"/api/v1/books/{book_id}", headers=owner_headers)
    assert book_check.json()["current_page"] == 0
