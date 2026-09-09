def _create_user(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    token = signup_resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}, signup_resp.json()["user"]["id"]


def test_create_and_list_bookmarks(client):
    headers, _ = _create_user(client, "bookmarker1@example.com", "Bookmarker 1")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Bookmark Book", "author": "Author", "total_pages": 150},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    # Create bookmarks on pages 10, 25, 80
    pages = [10, 25, 80]
    for p in pages:
        bm_resp = client.post(
            f"/api/v1/books/{book_id}/bookmarks",
            headers=headers,
            json={"page_number": p, "label": f"Chapter {p // 10}"},
        )
        assert bm_resp.status_code == 201
        assert bm_resp.json()["page_number"] == p
        assert bm_resp.json()["label"] == f"Chapter {p // 10}"

    # List bookmarks -> should be sorted by page_number
    list_resp = client.get(f"/api/v1/books/{book_id}/bookmarks", headers=headers)
    assert list_resp.status_code == 200
    bms = list_resp.json()
    assert len(bms) == 3
    assert [b["page_number"] for b in bms] == [10, 25, 80]


def test_delete_bookmark(client):
    headers, _ = _create_user(client, "bookmarker2@example.com", "Bookmarker 2")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Delete BM Book", "author": "Author", "total_pages": 40},
    )
    book_id = b_resp.json()["id"]

    # Create bookmark
    bm_resp = client.post(
        f"/api/v1/books/{book_id}/bookmarks",
        headers=headers,
        json={"page_number": 15},
    )
    bm_id = bm_resp.json()["id"]

    # Delete bookmark
    del_resp = client.delete(f"/api/v1/books/{book_id}/bookmarks/{bm_id}", headers=headers)
    assert del_resp.status_code == 204

    # List is now empty
    list_resp = client.get(f"/api/v1/books/{book_id}/bookmarks", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0


def test_bookmarks_cross_user_isolation(client):
    owner_headers, _ = _create_user(client, "bm_owner@example.com", "BM Owner")
    borrower_headers, borrower_id = _create_user(client, "bm_borrower@example.com", "BM Borrower")

    b_resp = client.post(
        "/api/v1/books",
        headers=owner_headers,
        json={"title": "Shared BM Book", "author": "Author", "total_pages": 60},
    )
    book_id = b_resp.json()["id"]

    # Lend to borrower
    client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=owner_headers,
        json={"borrower_id": borrower_id},
    )

    # Owner creates bookmark on page 5
    owner_bm = client.post(
        f"/api/v1/books/{book_id}/bookmarks",
        headers=owner_headers,
        json={"page_number": 5, "label": "Owner BM"},
    )
    assert owner_bm.status_code == 201
    owner_bm_id = owner_bm.json()["id"]

    # Borrower creates bookmark on page 5 (allowed because bookmarks are per-user!)
    borrower_bm = client.post(
        f"/api/v1/books/{book_id}/bookmarks",
        headers=borrower_headers,
        json={"page_number": 5, "label": "Borrower BM"},
    )
    assert borrower_bm.status_code == 201

    # Owner only sees owner's bookmark
    owner_list = client.get(f"/api/v1/books/{book_id}/bookmarks", headers=owner_headers).json()
    assert len(owner_list) == 1
    assert owner_list[0]["label"] == "Owner BM"

    # Borrower only sees borrower's bookmark
    borrower_list = client.get(f"/api/v1/books/{book_id}/bookmarks", headers=borrower_headers).json()
    assert len(borrower_list) == 1
    assert borrower_list[0]["label"] == "Borrower BM"

    # Borrower cannot delete owner's bookmark
    forbidden_del = client.delete(
        f"/api/v1/books/{book_id}/bookmarks/{owner_bm_id}",
        headers=borrower_headers,
    )
    assert forbidden_del.status_code == 403
