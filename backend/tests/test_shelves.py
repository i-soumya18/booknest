def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


def test_create_and_get_shelf(client):
    headers, _ = _create_user_and_login(client, "shelfuser@example.com", "Shelf User")

    # Create shelf
    create_resp = client.post(
        "/api/v1/shelves",
        headers=headers,
        json={"name": "Sci-Fi Classics", "description": "My favorite sci-fi books"},
    )
    assert create_resp.status_code == 201
    shelf_data = create_resp.json()
    assert shelf_data["name"] == "Sci-Fi Classics"
    shelf_id = shelf_data["id"]

    # List shelves
    list_resp = client.get("/api/v1/shelves", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # Get shelf detail
    detail_resp = client.get(f"/api/v1/shelves/{shelf_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["name"] == "Sci-Fi Classics"
    assert detail_resp.json()["books"] == []


def test_shelf_book_associations(client):
    headers, _ = _create_user_and_login(client, "assocuser@example.com", "Assoc User")

    # Create 2 books
    b1_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Dune", "author": "Frank Herbert", "total_pages": 412},
    )
    b2_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Foundation", "author": "Isaac Asimov", "total_pages": 255},
    )
    b1_id = b1_resp.json()["id"]
    b2_id = b2_resp.json()["id"]

    # Create shelf
    s_resp = client.post(
        "/api/v1/shelves",
        headers=headers,
        json={"name": "Must Read"},
    )
    s_id = s_resp.json()["id"]

    # Add b1 and b2 to shelf
    add1 = client.post(f"/api/v1/shelves/{s_id}/books/{b1_id}", headers=headers)
    assert add1.status_code == 201
    add2 = client.post(f"/api/v1/shelves/{s_id}/books/{b2_id}", headers=headers)
    assert add2.status_code == 201

    # View shelf detail -> should contain both books
    detail = client.get(f"/api/v1/shelves/{s_id}", headers=headers).json()
    assert len(detail["books"]) == 2

    # Remove b1 from shelf
    rem1 = client.delete(f"/api/v1/shelves/{s_id}/books/{b1_id}", headers=headers)
    assert rem1.status_code == 204

    # View shelf detail -> should contain only b2
    detail_after = client.get(f"/api/v1/shelves/{s_id}", headers=headers).json()
    assert len(detail_after["books"]) == 1
    assert detail_after["books"][0]["id"] == b2_id


def test_shelf_deletion_leaves_books_untouched(client):
    headers, _ = _create_user_and_login(client, "deluser@example.com", "Delete User")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "1984", "author": "George Orwell", "total_pages": 328},
    )
    b_id = b_resp.json()["id"]

    # Create shelf & add book
    s_resp = client.post(
        "/api/v1/shelves",
        headers=headers,
        json={"name": "Dystopian"},
    )
    s_id = s_resp.json()["id"]

    client.post(f"/api/v1/shelves/{s_id}/books/{b_id}", headers=headers)

    # Delete shelf
    del_shelf = client.delete(f"/api/v1/shelves/{s_id}", headers=headers)
    assert del_shelf.status_code == 204

    # Book MUST still exist in user's books!
    get_book = client.get(f"/api/v1/books/{b_id}", headers=headers)
    assert get_book.status_code == 200
    assert get_book.json()["title"] == "1984"


def test_book_deletion_cleans_shelf_association(client):
    headers, _ = _create_user_and_login(client, "bdeluser@example.com", "Book Del User")

    # Create book & shelf
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Fahrenheit 451", "author": "Ray Bradbury", "total_pages": 249},
    )
    b_id = b_resp.json()["id"]

    s_resp = client.post(
        "/api/v1/shelves",
        headers=headers,
        json={"name": "Classics"},
    )
    s_id = s_resp.json()["id"]

    client.post(f"/api/v1/shelves/{s_id}/books/{b_id}", headers=headers)

    # Delete book
    del_book = client.delete(f"/api/v1/books/{b_id}", headers=headers)
    assert del_book.status_code == 204

    # View shelf detail -> shelf exists, but book list is empty (no orphan junction row crash)
    detail = client.get(f"/api/v1/shelves/{s_id}", headers=headers).json()
    assert detail["name"] == "Classics"
    assert detail["books"] == []


def test_cross_user_shelf_isolation(client):
    headers_a, _ = _create_user_and_login(client, "shelfa@example.com", "User A")
    headers_b, _ = _create_user_and_login(client, "shelfb@example.com", "User B")

    s_resp = client.post(
        "/api/v1/shelves",
        headers=headers_a,
        json={"name": "User A Private Shelf"},
    )
    s_id = s_resp.json()["id"]

    # User B GET shelf -> 404
    assert client.get(f"/api/v1/shelves/{s_id}", headers=headers_b).status_code == 404
    # User B PUT shelf -> 404
    assert (
        client.put(
            f"/api/v1/shelves/{s_id}", headers=headers_b, json={"name": "Hacked"}
        ).status_code
        == 404
    )
    # User B DELETE shelf -> 404
    assert client.delete(f"/api/v1/shelves/{s_id}", headers=headers_b).status_code == 404
