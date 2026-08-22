def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


def test_empty_dashboard_metrics(client):
    headers, _ = _create_user_and_login(client, "dash_empty@example.com", "Dash Empty")

    resp = client.get("/api/v1/dashboard", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["books_by_status"]["WANT_TO_READ"] == 0
    assert data["books_by_status"]["READING"] == 0
    assert data["books_by_status"]["FINISHED"] == 0
    assert data["books_finished_this_year"] == 0

    assert data["average_rating"] is None
    assert data["shelf_with_most_books"] is None
    assert data["books_currently_lent_out"] == 0
    assert data["shelves_shared_with_user"] == 0
    assert isinstance(data["recent_activity"], list)


def test_populated_dashboard_metrics(client):
    headers_owner, _ = _create_user_and_login(client, "dash_owner@example.com", "Dash Owner")
    headers_borrower, borrower_id = _create_user_and_login(
        client, "dash_borrower@example.com", "Dash Borrower"
    )

    # Add books
    b1 = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Book One",
            "author": "Author 1",
            "status": "FINISHED",
            "total_pages": 200,
            "rating": 5.0,
        },
    ).json()

    b2 = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Book Two",
            "author": "Author 2",
            "status": "READING",
            "total_pages": 300,
            "rating": 4.0,
        },
    ).json()

    # Create shelf & add b1
    s_resp = client.post("/api/v1/shelves", headers=headers_owner, json={"name": "Favorites Shelf"})
    shelf_id = s_resp.json()["id"]
    client.post(f"/api/v1/shelves/{shelf_id}/books/{b1['id']}", headers=headers_owner)

    # Lend b2 to borrower
    client.post(
        f"/api/v1/books/{b2['id']}/lend", headers=headers_owner, json={"borrower_id": borrower_id}
    )

    # Share shelf with borrower
    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "dash_borrower@example.com", "role": "VIEWER"},
    )

    # Fetch Owner Dashboard
    resp = client.get("/api/v1/dashboard", headers=headers_owner)
    assert resp.status_code == 200
    data = resp.json()

    assert data["books_by_status"]["FINISHED"] == 1
    assert data["books_by_status"]["READING"] == 1
    assert data["books_finished_this_year"] == 1
    assert data["average_rating"] == 4.5
    assert data["shelf_with_most_books"]["id"] == shelf_id
    assert data["shelf_with_most_books"]["book_count"] == 1
    assert data["books_currently_lent_out"] == 1

    # Fetch Borrower Dashboard
    borrower_dash = client.get("/api/v1/dashboard", headers=headers_borrower).json()
    assert borrower_dash["shelves_shared_with_user"] == 1
