def _create_user(client, email: str, name: str, password: str = "StrongPassword123!") -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password, "name": name},
    )
    assert signup_resp.status_code == 201
    token = signup_resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}, signup_resp.json()["user"]["id"]


def test_admin_non_admin_forbidden(client):
    headers, _ = _create_user(client, "regular_user@example.com", "Regular User")

    # Regular user attempting admin routes -> 403
    assert client.get("/api/v1/admin/analytics", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/settings", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/audit-log", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/moderation/files", headers=headers).status_code == 403


def test_admin_analytics_and_users(client):
    admin_headers, admin_id = _create_user(
        client, "sahoosoumya242004@gmail.com", "Super Admin", "iamAdmin@nestbook773789"
    )
    user_headers, user_id = _create_user(client, "managed_user@example.com", "Managed User")

    # 1. Analytics
    analytics_resp = client.get("/api/v1/admin/analytics", headers=admin_headers)
    assert analytics_resp.status_code == 200
    data = analytics_resp.json()
    assert data["total_users"] >= 2
    assert "total_books_with_file" in data
    assert "active_readers_7d" in data

    # 2. List users
    users_resp = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_resp.status_code == 200
    user_list = users_resp.json()
    assert len(user_list) >= 2

    # 3. User detail
    detail_resp = client.get(f"/api/v1/admin/users/{user_id}", headers=admin_headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["email"] == "managed_user@example.com"
    assert detail["is_active"] is True

    # 4. Deactivate user
    deact_resp = client.patch(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    # Deactivated user cannot login
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": "managed_user@example.com", "password": "StrongPassword123!"},
    )
    assert bad_login.status_code == 403
    assert "ACCOUNT_DEACTIVATED" in str(bad_login.json())

    # 5. Reactivate user
    react_resp = client.patch(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_headers,
        json={"is_active": True},
    )
    assert react_resp.status_code == 200
    assert react_resp.json()["is_active"] is True

    # User can login again
    good_login = client.post(
        "/api/v1/auth/login",
        json={"email": "managed_user@example.com", "password": "StrongPassword123!"},
    )
    assert good_login.status_code == 200

    # 6. Admin cannot deactivate self
    self_deact = client.patch(
        f"/api/v1/admin/users/{admin_id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert self_deact.status_code == 400
    assert "CANNOT_DEACTIVATE_SELF" in str(self_deact.json())

    # 7. Reset password
    reset_resp = client.post(
        f"/api/v1/admin/users/{user_id}/reset-password",
        headers=admin_headers,
        json={"new_password": "BrandNewSecretPassword123!"},
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["temporary_password"] == "BrandNewSecretPassword123!"

    # Login with new password
    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "managed_user@example.com", "password": "BrandNewSecretPassword123!"},
    )
    assert new_login.status_code == 200


def test_admin_settings_and_audit_log(client):
    admin_headers, _ = _create_user(
        client, "sahoosoumya242004@gmail.com", "Super Admin", "iamAdmin@nestbook773789"
    )

    # 1. Get settings
    settings_resp = client.get("/api/v1/admin/settings", headers=admin_headers)
    assert settings_resp.status_code == 200
    settings_list = settings_resp.json()
    keys = [s["key"] for s in settings_list]
    assert "max_upload_size_mb" in keys
    assert "announcement_banner" in keys

    # 2. Update setting
    patch_resp = client.patch(
        "/api/v1/admin/settings",
        headers=admin_headers,
        json={"key": "announcement_banner", "value": "Welcome to BookNest V2!"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["value"] == "Welcome to BookNest V2!"

    # Verify cache / persistence
    refetch = client.get("/api/v1/admin/settings", headers=admin_headers).json()
    banner = next(s for s in refetch if s["key"] == "announcement_banner")
    assert banner["value"] == "Welcome to BookNest V2!"

    # 3. Audit log contains the SETTINGS_CHANGED entry
    audit_resp = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert audit_resp.status_code == 200
    audit_logs = audit_resp.json()
    assert len(audit_logs) >= 1
    actions = [a["action"] for a in audit_logs]
    assert "SETTINGS_CHANGED" in actions


def test_admin_file_moderation(client):
    admin_headers, _ = _create_user(
        client, "sahoosoumya242004@gmail.com", "Super Admin", "iamAdmin@nestbook773789"
    )
    user_headers, _ = _create_user(client, "author_mod@example.com", "Author Mod")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=user_headers,
        json={"title": "Moderated Book", "author": "Mod Author", "total_pages": 10},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    # Upload PDF
    from tests.test_file_upload import make_minimal_pdf
    pdf_bytes = make_minimal_pdf()
    upload_resp = client.post(
        f"/api/v1/books/{book_id}/upload",
        headers=user_headers,
        files={"file": ("test_mod.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_resp.status_code == 201

    # Admin lists files
    files_resp = client.get("/api/v1/admin/moderation/files", headers=admin_headers)
    assert files_resp.status_code == 200
    files = files_resp.json()
    target_file = next((f for f in files if f["book_id"] == book_id), None)
    assert target_file is not None
    assert target_file["original_name"] == "test_mod.pdf"
    assert target_file["uploader_email"] == "author_mod@example.com"

    # Admin deletes file
    del_resp = client.delete(
        f"/api/v1/admin/moderation/files/{target_file['id']}",
        headers=admin_headers,
    )
    assert del_resp.status_code == 204

    # File no longer in list
    files_after = client.get("/api/v1/admin/moderation/files", headers=admin_headers).json()
    assert not any(f["id"] == target_file["id"] for f in files_after)

