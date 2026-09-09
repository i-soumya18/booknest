def _create_user(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    token = signup_resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}, signup_resp.json()["user"]["id"]


def test_create_and_list_highlights(client):
    headers, _ = _create_user(client, "annotator1@example.com", "Annotator 1")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Annotated Book", "author": "Author", "total_pages": 50},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    # Create 5 highlights across all allowed colors
    colors = ["yellow", "green", "blue", "pink", "purple"]
    for i, color in enumerate(colors, start=1):
        h_resp = client.post(
            f"/api/v1/books/{book_id}/highlights",
            headers=headers,
            json={
                "page_number": i,
                "start_offset": 10 * i,
                "end_offset": 20 * i,
                "selected_text": f"Selected text in {color}",
                "color": color,
            },
        )
        assert h_resp.status_code == 201
        data = h_resp.json()
        assert data["color"] == color
        assert data["selected_text"] == f"Selected text in {color}"
        assert data["page_number"] == i

    # List highlights
    list_resp = client.get(f"/api/v1/books/{book_id}/highlights", headers=headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 5
    assert [item["color"] for item in items] == colors


def test_add_and_update_annotation_on_highlight(client):
    headers, _ = _create_user(client, "annotator2@example.com", "Annotator 2")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Notes Book", "author": "Author", "total_pages": 100},
    )
    book_id = b_resp.json()["id"]

    # Create highlight
    h_resp = client.post(
        f"/api/v1/books/{book_id}/highlights",
        headers=headers,
        json={
            "page_number": 12,
            "start_offset": 0,
            "end_offset": 15,
            "selected_text": "Important passage",
            "color": "yellow",
        },
    )
    assert h_resp.status_code == 201
    highlight_id = h_resp.json()["id"]

    # Add annotation note
    ann_resp = client.post(
        f"/api/v1/books/{book_id}/highlights/{highlight_id}/annotations",
        headers=headers,
        json={"content": "This is a profound insight on page 12"},
    )
    assert ann_resp.status_code == 201
    annotation_id = ann_resp.json()["id"]
    assert ann_resp.json()["content"] == "This is a profound insight on page 12"

    # Update annotation note
    up_ann_resp = client.patch(
        f"/api/v1/books/{book_id}/highlights/{highlight_id}/annotations/{annotation_id}",
        headers=headers,
        json={"content": "Updated insight with more detail"},
    )
    assert up_ann_resp.status_code == 200
    assert up_ann_resp.json()["content"] == "Updated insight with more detail"

    # Verify highlight includes updated annotation
    get_h = client.get(f"/api/v1/books/{book_id}/highlights", headers=headers)
    assert get_h.status_code == 200
    assert len(get_h.json()[0]["annotations"]) == 1
    assert get_h.json()[0]["annotations"][0]["content"] == "Updated insight with more detail"


def test_delete_highlight_cascades_annotations(client):
    headers, _ = _create_user(client, "annotator3@example.com", "Annotator 3")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Delete Book", "author": "Author", "total_pages": 30},
    )
    book_id = b_resp.json()["id"]

    h_resp = client.post(
        f"/api/v1/books/{book_id}/highlights",
        headers=headers,
        json={
            "page_number": 5,
            "start_offset": 5,
            "end_offset": 20,
            "selected_text": "Temporary quote",
            "color": "pink",
        },
    )
    highlight_id = h_resp.json()["id"]

    # Add note
    client.post(
        f"/api/v1/books/{book_id}/highlights/{highlight_id}/annotations",
        headers=headers,
        json={"content": "Note to be deleted"},
    )

    # Delete highlight
    del_resp = client.delete(f"/api/v1/books/{book_id}/highlights/{highlight_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify highlights list is now empty
    list_resp = client.get(f"/api/v1/books/{book_id}/highlights", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0


def test_highlights_are_user_private_on_shared_book(client):
    owner_headers, _ = _create_user(client, "owner_priv@example.com", "Owner Priv")
    borrower_headers, borrower_id = _create_user(client, "borrower_priv@example.com", "Borrower Priv")

    b_resp = client.post(
        "/api/v1/books",
        headers=owner_headers,
        json={"title": "Shared Privacy Book", "author": "Author", "total_pages": 50},
    )
    book_id = b_resp.json()["id"]

    # Lend book to borrower
    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=owner_headers,
        json={"borrower_id": borrower_id},
    )
    assert lend_resp.status_code == 201

    # Owner creates highlight
    owner_h = client.post(
        f"/api/v1/books/{book_id}/highlights",
        headers=owner_headers,
        json={
            "page_number": 2,
            "start_offset": 0,
            "end_offset": 10,
            "selected_text": "Owner secret note",
            "color": "yellow",
        },
    )
    assert owner_h.status_code == 201
    owner_h_id = owner_h.json()["id"]

    # Borrower creates highlight
    borrower_h = client.post(
        f"/api/v1/books/{book_id}/highlights",
        headers=borrower_headers,
        json={
            "page_number": 2,
            "start_offset": 15,
            "end_offset": 30,
            "selected_text": "Borrower secret note",
            "color": "blue",
        },
    )
    assert borrower_h.status_code == 201

    # Owner lists highlights -> only sees owner's highlight
    owner_list = client.get(f"/api/v1/books/{book_id}/highlights", headers=owner_headers).json()
    assert len(owner_list) == 1
    assert owner_list[0]["selected_text"] == "Owner secret note"

    # Borrower lists highlights -> only sees borrower's highlight
    borrower_list = client.get(f"/api/v1/books/{book_id}/highlights", headers=borrower_headers).json()
    assert len(borrower_list) == 1
    assert borrower_list[0]["selected_text"] == "Borrower secret note"

    # Borrower cannot edit or delete owner's highlight
    forbidden_edit = client.patch(
        f"/api/v1/books/{book_id}/highlights/{owner_h_id}",
        headers=borrower_headers,
        json={"color": "purple"},
    )
    assert forbidden_edit.status_code == 403

    forbidden_del = client.delete(
        f"/api/v1/books/{book_id}/highlights/{owner_h_id}",
        headers=borrower_headers,
    )
    assert forbidden_del.status_code == 403
