def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


def test_create_and_get_book(client):
    headers, _ = _create_user_and_login(client, "bookuser1@example.com", "Book User 1")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Clean Code",
            "author": "Robert C. Martin",
            "status": "READING",
            "total_pages": 464,
            "current_page": 120,
            "rating": 5,
            "notes": "Great software principles",
        },
    )
    assert create_resp.status_code == 201
    book_data = create_resp.json()
    assert book_data["title"] == "Clean Code"
    assert book_data["status"] == "READING"
    assert book_data["rating"] == 5
    book_id = book_data["id"]

    get_resp = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == "Clean Code"


def test_list_books_isolation(client):
    headers_a, _ = _create_user_and_login(client, "usera@example.com", "User A")
    headers_b, _ = _create_user_and_login(client, "userb@example.com", "User B")

    client.post(
        "/api/v1/books",
        headers=headers_a,
        json={
            "title": "User A Book",
            "author": "Author A",
            "status": "WANT_TO_READ",
            "total_pages": 200,
        },
    )

    client.post(
        "/api/v1/books",
        headers=headers_b,
        json={
            "title": "User B Book",
            "author": "Author B",
            "status": "FINISHED",
            "total_pages": 300,
        },
    )

    list_a = client.get("/api/v1/books", headers=headers_a)
    assert list_a.status_code == 200
    items_a = list_a.json()
    assert len(items_a) == 1
    assert items_a[0]["title"] == "User A Book"

    list_b = client.get("/api/v1/books", headers=headers_b)
    assert list_b.status_code == 200
    items_b = list_b.json()
    assert len(items_b) == 1
    assert items_b[0]["title"] == "User B Book"


def test_cross_user_access_blocked(client):
    headers_a, _ = _create_user_and_login(client, "owner@example.com", "Owner")
    headers_b, _ = _create_user_and_login(client, "other@example.com", "Other")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers_a,
        json={
            "title": "Private Book",
            "author": "Owner Author",
            "status": "WANT_TO_READ",
            "total_pages": 150,
        },
    )
    book_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/v1/books/{book_id}", headers=headers_b)
    assert get_resp.status_code == 404

    put_resp = client.put(
        f"/api/v1/books/{book_id}",
        headers=headers_b,
        json={"title": "Hacked Title"},
    )
    assert put_resp.status_code == 404

    del_resp = client.delete(f"/api/v1/books/{book_id}", headers=headers_b)
    assert del_resp.status_code == 404


def test_update_and_delete_book(client):
    headers, _ = _create_user_and_login(client, "crud@example.com", "CRUD User")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Initial Title",
            "author": "Initial Author",
            "status": "WANT_TO_READ",
            "total_pages": 250,
        },
    )
    book_id = create_resp.json()["id"]

    update_resp = client.put(
        f"/api/v1/books/{book_id}",
        headers=headers,
        json={"title": "Updated Title", "status": "FINISHED", "rating": 4},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated Title"
    assert update_resp.json()["status"] == "FINISHED"
    assert update_resp.json()["rating"] == 4

    del_resp = client.delete(f"/api/v1/books/{book_id}", headers=headers)
    assert del_resp.status_code == 204

    get_resp = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert get_resp.status_code == 404


def test_book_validation_errors(client):
    headers, _ = _create_user_and_login(client, "valid@example.com", "Valid User")

    resp1 = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Test",
            "author": "Test",
            "status": "READING",
            "total_pages": 100,
            "rating": 6,
        },
    )
    assert resp1.status_code == 422

    resp2 = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Test",
            "author": "Test",
            "status": "READING",
            "total_pages": 100,
            "current_page": 150,
        },
    )
    assert resp2.status_code == 422
