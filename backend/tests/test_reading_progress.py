def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


def test_reading_progress_valid_update(client):
    headers, _ = _create_user_and_login(client, "proguser1@example.com", "Prog User 1")

    # Create book in WANT_TO_READ
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "The Hobbit",
            "author": "J.R.R. Tolkien",
            "status": "WANT_TO_READ",
            "total_pages": 310,
        },
    )
    b_id = b_resp.json()["id"]

    # Update progress to 155 pages (50%)
    prog_resp = client.patch(
        f"/api/v1/books/{b_id}/progress",
        headers=headers,
        json={"current_page": 155},
    )
    assert prog_resp.status_code == 200
    data = prog_resp.json()
    assert data["current_page"] == 155
    assert data["progress_percentage"] == 50
    assert data["status"] == "READING"
    assert data["finished_at"] is None


def test_reading_progress_atomic_auto_finish(client):
    headers, _ = _create_user_and_login(client, "proguser2@example.com", "Prog User 2")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Atomic Habits",
            "author": "James Clear",
            "status": "READING",
            "total_pages": 320,
            "current_page": 200,
        },
    )
    b_id = b_resp.json()["id"]

    # Update progress to total pages (320)
    prog_resp = client.patch(
        f"/api/v1/books/{b_id}/progress",
        headers=headers,
        json={"current_page": 320},
    )
    assert prog_resp.status_code == 200
    data = prog_resp.json()
    assert data["current_page"] == 320
    assert data["progress_percentage"] == 100
    assert data["status"] == "FINISHED"
    assert data["finished_at"] is not None


def test_reading_progress_validation_rejections(client):
    headers, _ = _create_user_and_login(client, "proguser3@example.com", "Prog User 3")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Sapiens",
            "author": "Yuval Noah Harari",
            "status": "READING",
            "total_pages": 443,
        },
    )
    b_id = b_resp.json()["id"]

    # 1. Negative current_page -> 422
    resp_neg = client.patch(
        f"/api/v1/books/{b_id}/progress",
        headers=headers,
        json={"current_page": -10},
    )
    assert resp_neg.status_code == 422

    # 2. current_page > total_pages -> 422
    resp_exceed = client.patch(
        f"/api/v1/books/{b_id}/progress",
        headers=headers,
        json={"current_page": 500},
    )
    assert resp_exceed.status_code == 422


def test_reading_progress_unfinish_transition(client):
    headers, _ = _create_user_and_login(client, "proguser4@example.com", "Prog User 4")

    # Create finished book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Finished Book",
            "author": "Author",
            "status": "FINISHED",
            "total_pages": 200,
            "current_page": 200,
        },
    )
    b_id = b_resp.json()["id"]

    # Move progress back to 100 pages -> status transitions back to READING, finished_at is cleared
    prog_resp = client.patch(
        f"/api/v1/books/{b_id}/progress",
        headers=headers,
        json={"current_page": 100},
    )
    assert prog_resp.status_code == 200
    data = prog_resp.json()
    assert data["current_page"] == 100
    assert data["status"] == "READING"
    assert data["finished_at"] is None
