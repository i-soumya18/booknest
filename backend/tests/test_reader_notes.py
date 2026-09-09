import io
import uuid


def _create_user(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    token = signup_resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}, signup_resp.json()["user"]["id"]


def test_reader_notes_crud(client):
    headers, _ = _create_user(client, "noter1@example.com", "Note User 1")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Notes Test Book", "author": "Author", "total_pages": 100},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    # 1. Create note on page 12
    n1_resp = client.post(
        f"/api/v1/books/{book_id}/notes",
        headers=headers,
        json={"page_number": 12, "content": "Important clue on page 12"},
    )
    assert n1_resp.status_code == 201
    n1 = n1_resp.json()
    assert n1["page_number"] == 12
    assert n1["content"] == "Important clue on page 12"
    assert n1["attachments"] == []
    note_id = n1["id"]

    # 2. Create general book note (no page)
    n2_resp = client.post(
        f"/api/v1/books/{book_id}/notes",
        headers=headers,
        json={"content": "General overview thoughts about this book"},
    )
    assert n2_resp.status_code == 201
    assert n2_resp.json()["page_number"] is None

    # 3. List notes
    list_resp = client.get(f"/api/v1/books/{book_id}/notes", headers=headers)
    assert list_resp.status_code == 200
    notes = list_resp.json()
    assert len(notes) == 2

    # 4. Update note
    upd_resp = client.patch(
        f"/api/v1/books/{book_id}/notes/{note_id}",
        headers=headers,
        json={"content": "Updated clue content on page 12", "page_number": 13},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["content"] == "Updated clue content on page 12"
    assert upd_resp.json()["page_number"] == 13

    # 5. Delete note
    del_resp = client.delete(f"/api/v1/books/{book_id}/notes/{note_id}", headers=headers)
    assert del_resp.status_code == 204

    # Now only 1 note remains
    remaining = client.get(f"/api/v1/books/{book_id}/notes", headers=headers).json()
    assert len(remaining) == 1


def test_reader_note_attachments(client):
    headers, _ = _create_user(client, "attacher@example.com", "Attach User")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Attachment Test Book", "author": "Author", "total_pages": 50},
    )
    book_id = b_resp.json()["id"]

    note_resp = client.post(
        f"/api/v1/books/{book_id}/notes",
        headers=headers,
        json={"page_number": 5, "content": "Note with image and audio"},
    )
    note_id = note_resp.json()["id"]

    # Valid PNG image bytes (\x89PNG\r\n\x1a\n...)
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    img_resp = client.post(
        f"/api/v1/books/{book_id}/notes/{note_id}/attachments",
        headers=headers,
        files={"file": ("diagram.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert img_resp.status_code == 201
    img_att = img_resp.json()
    assert img_att["attachment_type"] == "image"
    assert img_att["mime_type"] == "image/png"
    img_id = img_att["id"]

    # Valid WebM audio bytes (\x1a\x45\xdf\xa3...)
    webm_bytes = b"\x1a\x45\xdf\xa3" + b"\x00" * 64
    audio_resp = client.post(
        f"/api/v1/books/{book_id}/notes/{note_id}/attachments",
        headers=headers,
        data={"duration_seconds": 45},
        files={"file": ("voice_memo.webm", io.BytesIO(webm_bytes), "audio/webm")},
    )
    assert audio_resp.status_code == 201
    audio_att = audio_resp.json()
    assert audio_att["attachment_type"] == "audio"
    assert audio_att["mime_type"] == "audio/webm"
    assert audio_att["duration_seconds"] == 45
    audio_id = audio_att["id"]

    # Check listing notes now contains both attachments
    notes_list = client.get(f"/api/v1/books/{book_id}/notes", headers=headers).json()
    assert len(notes_list[0]["attachments"]) == 2

    # Download attachment
    dl_resp = client.get(
        f"/api/v1/books/{book_id}/notes/{note_id}/attachments/{img_id}",
        headers=headers,
    )
    assert dl_resp.status_code == 200
    assert dl_resp.content == png_bytes

    # Delete single attachment
    del_att_resp = client.delete(
        f"/api/v1/books/{book_id}/notes/{note_id}/attachments/{img_id}",
        headers=headers,
    )
    assert del_att_resp.status_code == 204

    # Now only 1 attachment left
    notes_after = client.get(f"/api/v1/books/{book_id}/notes", headers=headers).json()
    assert len(notes_after[0]["attachments"]) == 1
    assert notes_after[0]["attachments"][0]["id"] == audio_id


def test_reader_notes_private_isolation(client):
    owner_headers, _ = _create_user(client, "note_owner@example.com", "Note Owner")
    other_headers, _ = _create_user(client, "note_other@example.com", "Note Other")

    b_resp = client.post(
        "/api/v1/books",
        headers=owner_headers,
        json={"title": "Private Notes Book", "author": "Author", "total_pages": 40},
    )
    book_id = b_resp.json()["id"]

    # Owner creates note
    note_resp = client.post(
        f"/api/v1/books/{book_id}/notes",
        headers=owner_headers,
        json={"page_number": 1, "content": "Private secret note"},
    )
    note_id = note_resp.json()["id"]

    # Other user lists notes -> empty!
    other_list = client.get(f"/api/v1/books/{book_id}/notes", headers=other_headers).json()
    assert len(other_list) == 0

    # Other user cannot update or delete owner's note
    upd_forbidden = client.patch(
        f"/api/v1/books/{book_id}/notes/{note_id}",
        headers=other_headers,
        json={"content": "Hacked content"},
    )
    assert upd_forbidden.status_code == 404

    del_forbidden = client.delete(
        f"/api/v1/books/{book_id}/notes/{note_id}",
        headers=other_headers,
    )
    assert del_forbidden.status_code == 404
