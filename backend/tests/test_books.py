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
    res_a = list_a.json()
    assert res_a["total"] == 1
    assert res_a["items"][0]["title"] == "User A Book"

    list_b = client.get("/api/v1/books", headers=headers_b)
    assert list_b.status_code == 200
    res_b = list_b.json()
    assert res_b["total"] == 1
    assert res_b["items"][0]["title"] == "User B Book"


def test_pagination_filter_search_sort(client):
    headers, _ = _create_user_and_login(client, "searchuser@example.com", "Search User")

    # Create 5 books
    books_data = [
        {
            "title": "Clean Code",
            "author": "Robert Martin",
            "status": "READING",
            "rating": 5,
            "total_pages": 400,
        },
        {
            "title": "Design Patterns",
            "author": "Erich Gamma",
            "status": "READING",
            "rating": 4,
            "total_pages": 350,
        },
        {
            "title": "Refactoring",
            "author": "Martin Fowler",
            "status": "FINISHED",
            "rating": 5,
            "total_pages": 450,
        },
        {
            "title": "The Pragmatic Programmer",
            "author": "Andrew Hunt",
            "status": "FINISHED",
            "rating": 5,
            "total_pages": 320,
        },
        {
            "title": "Domain-Driven Design",
            "author": "Eric Evans",
            "status": "WANT_TO_READ",
            "rating": 3,
            "total_pages": 500,
        },
    ]

    for b in books_data:
        client.post("/api/v1/books", headers=headers, json=b)

    # 1. Test pagination
    pag1 = client.get("/api/v1/books?page=1&page_size=2", headers=headers).json()
    assert pag1["page"] == 1
    assert pag1["page_size"] == 2
    assert pag1["total"] == 5
    assert pag1["total_pages"] == 3
    assert len(pag1["items"]) == 2

    pag2 = client.get("/api/v1/books?page=2&page_size=2", headers=headers).json()
    assert pag2["page"] == 2
    assert len(pag2["items"]) == 2

    # 2. Test status filter alone
    reading_resp = client.get("/api/v1/books?status=READING", headers=headers).json()
    assert reading_resp["total"] == 2
    assert all(b["status"] == "READING" for b in reading_resp["items"])

    # 3. Test search alone (title or author)
    search_resp = client.get("/api/v1/books?search=Martin", headers=headers).json()
    # Martin Fowler (author) and Clean Code (author Robert Martin)
    assert search_resp["total"] == 2

    # 4. Test combined status filter AND search
    combined_resp = client.get("/api/v1/books?status=READING&search=Martin", headers=headers).json()
    assert combined_resp["total"] == 1
    assert combined_resp["items"][0]["title"] == "Clean Code"

    # 5. Test sorting by title ascending
    sort_title = client.get("/api/v1/books?sort_by=title&sort_order=asc", headers=headers).json()
    titles = [b["title"] for b in sort_title["items"]]
    assert titles == sorted(titles)


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
