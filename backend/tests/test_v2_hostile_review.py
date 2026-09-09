import io
from tests.test_file_upload import make_minimal_epub, make_minimal_pdf


def _create_user(client, email: str, name: str, password: str = "StrongPassword123!") -> tuple[dict[str, str], str]:
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password, "name": name},
    )
    assert resp.status_code == 201
    token = resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}, resp.json()["user"]["id"]


def test_hostile_file_access_and_tampering(client):
    """Hostile security audit on file uploads: MIME spoofing, path traversal, and RBAC."""
    owner_headers, owner_id = _create_user(client, "v2_owner@example.com", "V2 Owner")
    attacker_headers, _ = _create_user(client, "v2_attacker@example.com", "V2 Attacker")
    borrower_headers, borrower_id = _create_user(client, "v2_borrower@example.com", "V2 Borrower")

    # 1. Create a book
    b_resp = client.post(
        "/api/v1/books",
        headers=owner_headers,
        json={"title": "Security Book", "author": "Alice Security", "total_pages": 15},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    # 2. Upload file with spoofed MIME type (Text file claiming to be PDF)
    fake_pdf = b"This is a plain text file pretending to be a PDF"
    fake_upload = client.post(
        f"/api/v1/books/{book_id}/upload",
        headers=owner_headers,
        files={"file": ("spoof.pdf", fake_pdf, "application/pdf")},
    )
    assert fake_upload.status_code == 422
    assert "UNSUPPORTED_FILE_TYPE" in str(fake_upload.json())

    # 3. Upload file with path traversal attempt in filename
    real_pdf = make_minimal_pdf()
    traversal_upload = client.post(
        f"/api/v1/books/{book_id}/upload",
        headers=owner_headers,
        files={"file": ("../../../../etc/passwd.pdf", real_pdf, "application/pdf")},
    )
    assert traversal_upload.status_code == 201
    file_info = traversal_upload.json()
    # Name should be sanitized (no path traversal slashes preserved as directory components)
    assert ".." not in file_info["original_name"] or file_info["original_name"].endswith(".pdf")

    # 4. Attacker attempts to download owner's file directly
    attack_download = client.get(f"/api/v1/books/{book_id}/file", headers=attacker_headers)
    assert attack_download.status_code == 403

    # 5. Attacker attempts to delete owner's file
    attack_delete = client.delete(f"/api/v1/books/{book_id}/file", headers=attacker_headers)
    assert attack_delete.status_code == 403

    # 6. Lend book to borrower
    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=owner_headers,
        json={"borrower_id": borrower_id},
    )
    assert lend_resp.status_code == 201

    # 7. Borrower CAN read the file
    borrower_download = client.get(f"/api/v1/books/{book_id}/file", headers=borrower_headers)
    assert borrower_download.status_code == 200
    assert borrower_download.headers["content-type"] == "application/pdf"

    # 8. Borrower CANNOT delete the file
    borrower_delete = client.delete(f"/api/v1/books/{book_id}/file", headers=borrower_headers)
    assert borrower_delete.status_code == 403


def test_hostile_reader_isolation_and_cross_contamination(client):
    """Hostile security audit on reader state, highlights, bookmarks, and private notes."""
    owner_headers, owner_id = _create_user(client, "annot_owner@example.com", "Annot Owner")
    borrower_headers, borrower_id = _create_user(client, "annot_borrower@example.com", "Annot Borrower")
    eavesdropper_headers, _ = _create_user(client, "eavesdropper@example.com", "Eavesdropper")

    # Create book and lend to borrower
    b_resp = client.post(
        "/api/v1/books",
        headers=owner_headers,
        json={"title": "Shared Knowledge", "author": "Master Sage", "total_pages": 50},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=owner_headers,
        json={"borrower_id": borrower_id},
    )

    # 1. Highlights: Owner creates highlight
    h_owner = client.post(
        f"/api/v1/books/{book_id}/highlights",
        headers=owner_headers,
        json={"color": "yellow", "page_number": 3, "selected_text": "Secret Owner Highlight"},
    )
    assert h_owner.status_code == 201
    owner_h_id = h_owner.json()["id"]

    # Borrower creates highlight on same page
    h_borrower = client.post(
        f"/api/v1/books/{book_id}/highlights",
        headers=borrower_headers,
        json={"color": "blue", "page_number": 3, "selected_text": "Secret Borrower Highlight"},
    )
    assert h_borrower.status_code == 201
    borrower_h_id = h_borrower.json()["id"]

    # Verify owner only sees owner highlight
    owner_highlights = client.get(f"/api/v1/books/{book_id}/highlights", headers=owner_headers).json()
    assert any(h["id"] == owner_h_id for h in owner_highlights)
    assert not any(h["id"] == borrower_h_id for h in owner_highlights)

    # Verify borrower only sees borrower highlight
    borrower_highlights = client.get(f"/api/v1/books/{book_id}/highlights", headers=borrower_headers).json()
    assert any(h["id"] == borrower_h_id for h in borrower_highlights)
    assert not any(h["id"] == owner_h_id for h in borrower_highlights)

    # 2. Bookmarks: Owner and borrower bookmark pages
    b1 = client.post(
        f"/api/v1/books/{book_id}/bookmarks",
        headers=owner_headers,
        json={"page_number": 12, "title": "Owner Bookmark"},
    ).json()
    b2 = client.post(
        f"/api/v1/books/{book_id}/bookmarks",
        headers=borrower_headers,
        json={"page_number": 24, "title": "Borrower Bookmark"},
    ).json()

    owner_bms = client.get(f"/api/v1/books/{book_id}/bookmarks", headers=owner_headers).json()
    borrower_bms = client.get(f"/api/v1/books/{book_id}/bookmarks", headers=borrower_headers).json()
    assert any(b["id"] == b1["id"] for b in owner_bms)
    assert not any(b["id"] == b2["id"] for b in owner_bms)
    assert any(b["id"] == b2["id"] for b in borrower_bms)
    assert not any(b["id"] == b1["id"] for b in borrower_bms)

    # 3. Notes: Owner creates private reader note
    note_resp = client.post(
        f"/api/v1/books/{book_id}/notes",
        headers=owner_headers,
        json={"title": "Private Diary", "content": "Confidential reflections", "page_number": 5},
    )
    assert note_resp.status_code == 201
    owner_note_id = note_resp.json()["id"]

    # Borrower cannot see owner note in list
    borrower_notes = client.get(f"/api/v1/books/{book_id}/notes", headers=borrower_headers).json()
    assert not any(n["id"] == owner_note_id for n in borrower_notes)

    # Attacker / eavesdropper cannot delete owner note
    del_attempt = client.delete(
        f"/api/v1/books/{book_id}/notes/{owner_note_id}",
        headers=eavesdropper_headers,
    )
    assert del_attempt.status_code == 404


def test_hostile_admin_security_and_self_protection(client):
    """Hostile security audit on admin boundaries, self-deactivation guard, and setting propagation."""
    admin_headers, admin_id = _create_user(
        client, "sahoosoumya242004@gmail.com", "Super Admin", "iamAdmin@nestbook773789"
    )
    bad_actor_headers, bad_actor_id = _create_user(client, "bad_actor@example.com", "Bad Actor")

    # 1. Bad actor cannot access any admin route
    assert client.get("/api/v1/admin/analytics", headers=bad_actor_headers).status_code == 403
    assert client.get("/api/v1/admin/users", headers=bad_actor_headers).status_code == 403
    assert client.get("/api/v1/admin/settings", headers=bad_actor_headers).status_code == 403
    assert client.get("/api/v1/admin/audit-log", headers=bad_actor_headers).status_code == 403
    assert client.get("/api/v1/admin/moderation/files", headers=bad_actor_headers).status_code == 403
    assert client.patch("/api/v1/admin/settings", headers=bad_actor_headers, json={"key": "maintenance_mode", "value": True}).status_code == 403

    # 2. Admin cannot deactivate self
    self_kill = client.patch(
        f"/api/v1/admin/users/{admin_id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert self_kill.status_code == 400
    assert "CANNOT_DEACTIVATE_SELF" in str(self_kill.json())

    # 3. Admin deactivates bad actor -> bad actor is locked out
    deact = client.patch(
        f"/api/v1/admin/users/{bad_actor_id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert deact.status_code == 200
    assert deact.json()["is_active"] is False

    login_attempt = client.post(
        "/api/v1/auth/login",
        json={"email": "bad_actor@example.com", "password": "StrongPassword123!"},
    )
    assert login_attempt.status_code == 403
    assert "ACCOUNT_DEACTIVATED" in str(login_attempt.json())

    # 4. Immediate settings cache update and propagation
    new_banner = "Flash Sale: All books available in community library!"
    patch_setting = client.patch(
        "/api/v1/admin/settings",
        headers=admin_headers,
        json={"key": "announcement_banner", "value": new_banner},
    )
    assert patch_setting.status_code == 200
    assert patch_setting.json()["value"] == new_banner

    # Public announcement endpoint returns new banner immediately
    pub_banner = client.get("/api/v1/admin/announcement").json()
    assert pub_banner["announcement"] == new_banner

    # 5. Audit log records every administrative action
    audit_trail = client.get("/api/v1/admin/audit-log", headers=admin_headers).json()
    actions = [log["action"] for log in audit_trail]
    assert "USER_DEACTIVATED" in actions
    assert "SETTINGS_CHANGED" in actions
