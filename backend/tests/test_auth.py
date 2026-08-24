import time
import uuid

import jwt
import pytest

from app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.config import get_settings

settings = get_settings()


# ============================================================================
# 1. Password Hashing & Cryptographic Security (Argon2id)
# ============================================================================


def test_argon2_hashing_and_security():
    """Verify that passwords are cryptographically hashed using Argon2id and never stored in plaintext."""
    password = "StrongPassword123!"
    hashed1 = hash_password(password)
    hashed2 = hash_password(password)

    # Must start with argon2id identifier
    assert hashed1.startswith("$argon2id$")
    assert hashed1 != password
    # Salting must ensure identical passwords produce distinct hashes
    assert hashed1 != hashed2
    # Verification
    assert verify_password(hashed1, password) is True
    assert verify_password(hashed1, "WrongPassword123!") is False
    assert verify_password(hashed1, "") is False


# ============================================================================
# 2. Signup Validation & Password Policy Rules
# ============================================================================


@pytest.mark.parametrize(
    "invalid_password,reason",
    [
        ("Short1!", "Less than 8 chars"),
        ("A" * 129 + "1!a", "Exceeds 128 chars"),
        ("lowercase123!", "Missing uppercase letter"),
        ("UPPERCASE123!", "Missing lowercase letter"),
        ("NoDigitsHere!", "Missing digit"),
        ("NoSpecialChar123", "Missing special character"),
        ("", "Empty password"),
    ],
)
def test_signup_password_policy_enforcement(client, invalid_password, reason):
    """Verify that passwords failing defined complexity rules are rejected with 422."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "password": invalid_password,
            "name": "Test User",
        },
    )
    assert resp.status_code == 422, f"Failed on {reason}"


@pytest.mark.parametrize(
    "valid_password",
    [
        "Str0ng!Pass",
        "P@ssw0rd123",
        "Valid#Password99",
        "Special$Char&9",
        "Key[99]Value!",
        "Secure.Password_2026",
    ],
)
def test_signup_valid_passwords_accepted(client, valid_password):
    """Verify valid passwords matching all complexity requirements are accepted."""
    email = f"valid_{uuid.uuid4().hex[:6]}@example.com"
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": valid_password, "name": "Valid User"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["email"] == email


@pytest.mark.parametrize(
    "invalid_email",
    [
        "plainaddress",
        "@missingusername.com",
        "username@.com",
        "username@com",
        "user name@example.com",
    ],
)
def test_signup_invalid_email_formats(client, invalid_email):
    """Verify invalid email formats are rejected with 422."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": invalid_email, "password": "StrongPassword123!", "name": "User Name"},
    )
    assert resp.status_code == 422


@pytest.mark.parametrize(
    "invalid_name",
    [
        "",
        "   ",
        "\t\n",
    ],
)
def test_signup_invalid_name(client, invalid_name):
    """Verify empty or whitespace-only names are rejected with 422."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": f"name_test_{uuid.uuid4().hex[:6]}@example.com",
            "password": "StrongPassword123!",
            "name": invalid_name,
        },
    )
    assert resp.status_code == 422


def test_signup_success_and_response_structure(client):
    """Verify successful signup returns user profile, tokens, and sets HttpOnly refresh cookie."""
    email = "newuser@example.com"
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "StrongPassword123!",
            "name": "Jane Doe",
        },
    )
    assert resp.status_code == 201
    data = resp.json()

    # User response structure (password_hash must NEVER be exposed)
    assert "user" in data
    assert data["user"]["email"] == email
    assert data["user"]["name"] == "Jane Doe"
    assert "id" in data["user"]
    assert "created_at" in data["user"]
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]

    # Token response structure
    assert "tokens" in data
    assert "access_token" in data["tokens"]
    assert data["tokens"]["token_type"] == "bearer"
    assert data["tokens"]["expires_in"] == settings.jwt_access_ttl_minutes * 60

    # Refresh token cookie
    assert "refresh_token" in resp.cookies


def test_signup_rejects_duplicate_email_case_insensitive(client):
    """Verify duplicate email registration is rejected with 400 Bad Request regardless of case."""
    client.post(
        "/api/v1/auth/signup",
        json={"email": "alice@example.com", "password": "StrongPassword123!", "name": "Alice A"},
    )

    # Attempt signup with upper/mixed case of same email
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "ALICE@Example.COM", "password": "StrongPassword123!", "name": "Alice B"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["error"]["code"] == "EMAIL_ALREADY_EXISTS"


# ============================================================================
# 3. Login Endpoint & Credentials Verification
# ============================================================================


def test_login_success_case_insensitive_email(client):
    """Verify successful login with valid credentials and case-insensitive email matching."""
    client.post(
        "/api/v1/auth/signup",
        json={"email": "bob@example.com", "password": "StrongPassword123!", "name": "Bob B"},
    )

    # Login with uppercase email
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "BOB@EXAMPLE.COM", "password": "StrongPassword123!"},
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert data["user"]["email"] == "bob@example.com"
    assert "access_token" in data["tokens"]
    assert "refresh_token" in login_resp.cookies


def test_login_rejects_wrong_password(client):
    """Verify login with invalid password returns 401 INVALID_CREDENTIALS."""
    client.post(
        "/api/v1/auth/signup",
        json={"email": "charlie@example.com", "password": "StrongPassword123!", "name": "Charlie"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "charlie@example.com", "password": "IncorrectPassword123!"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_rejects_nonexistent_user(client):
    """Verify login with non-existent email returns 401 without revealing user enumeration info."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "StrongPassword123!"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "INVALID_CREDENTIALS"


# ============================================================================
# 4. Protected Endpoints & Access Token Validation (`/me`)
# ============================================================================


def test_protected_endpoint_requires_authentication(client):
    """Verify unauthenticated calls to protected routes return 401 UNAUTHENTICATED."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "UNAUTHENTICATED"


def test_protected_endpoint_invalid_authorization_scheme(client):
    """Verify non-Bearer Authorization headers return 401."""
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Basic dXNlcm5hbWU6cGFzc3dvcmQ="},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "UNAUTHENTICATED"


def test_protected_endpoint_malformed_jwt(client):
    """Verify malformed or invalid JWT returns 401 EXPIRED_OR_INVALID_TOKEN."""
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.valid.jwt.token"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "EXPIRED_OR_INVALID_TOKEN"


def test_protected_endpoint_tampered_signature_jwt(client):
    """Verify JWT with an invalid signature returns 401."""
    fake_token = jwt.encode(
        {"sub": str(uuid.uuid4()), "email": "fake@example.com", "type": "access"},
        "wrong-secret-key-that-is-at-least-32-bytes-long!",
        algorithm="HS256",
    )
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "EXPIRED_OR_INVALID_TOKEN"


def test_protected_endpoint_wrong_token_type(client):
    """Verify token with type != 'access' is rejected."""
    wrong_type_token = jwt.encode(
        {"sub": str(uuid.uuid4()), "email": "fake@example.com", "type": "refresh"},
        settings.jwt_secret,
        algorithm="HS256",
    )
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {wrong_type_token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "EXPIRED_OR_INVALID_TOKEN"


def test_protected_endpoint_expired_access_token(client):
    """Verify expired access token returns 401 EXPIRED_OR_INVALID_TOKEN."""
    expired_payload = {
        "sub": str(uuid.uuid4()),
        "email": "user@example.com",
        "type": "access",
        "iat": int(time.time()) - 3600,
        "exp": int(time.time()) - 1800,  # Expired 30 mins ago
    }
    expired_token = jwt.encode(expired_payload, settings.jwt_secret, algorithm="HS256")

    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "EXPIRED_OR_INVALID_TOKEN"


def test_protected_endpoint_invalid_subject_uuid(client):
    """Verify token with non-UUID subject returns 401 INVALID_TOKEN_SUBJECT."""
    bad_sub_token = jwt.encode(
        {"sub": "not-a-valid-uuid", "email": "user@example.com", "type": "access"},
        settings.jwt_secret,
        algorithm="HS256",
    )
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {bad_sub_token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "INVALID_TOKEN_SUBJECT"


def test_protected_endpoint_nonexistent_user_id(client):
    """Verify token with UUID of deleted/non-existent user returns 401 USER_NOT_FOUND."""
    random_user_id = str(uuid.uuid4())
    token, _ = create_access_token(random_user_id, "ghost@example.com")

    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "USER_NOT_FOUND"


# ============================================================================
# 5. Refresh Token Flow & Rotation
# ============================================================================


def test_refresh_token_rotation_and_revocation(client):
    """Verify refresh token rotation: each refresh invalidates old token and returns a new one."""
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "rotate@example.com", "password": "StrongPassword123!", "name": "Rotate"},
    )
    assert signup_resp.status_code == 201
    initial_refresh_cookie = signup_resp.cookies.get("refresh_token")
    assert initial_refresh_cookie is not None

    # First refresh: succeeds
    client.cookies.set("refresh_token", initial_refresh_cookie)
    refresh1_resp = client.post("/api/v1/auth/refresh")
    assert refresh1_resp.status_code == 200
    new_access_token1 = refresh1_resp.json()["tokens"]["access_token"]
    rotated_refresh_cookie1 = refresh1_resp.cookies.get("refresh_token")
    assert rotated_refresh_cookie1 != initial_refresh_cookie

    # Validate new access token works
    me_resp = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_token1}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "rotate@example.com"

    # Replay attack: Old refresh token must be rejected with 401
    client.cookies.set("refresh_token", initial_refresh_cookie)
    replay_resp = client.post("/api/v1/auth/refresh")
    assert replay_resp.status_code == 401
    assert replay_resp.json()["detail"]["error"]["code"] == "INVALID_REFRESH_TOKEN"


def test_refresh_token_via_header_fallback(client):
    """Verify refresh works via X-Refresh-Token header when cookies are disabled/bypassed."""
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "header@example.com", "password": "StrongPassword123!", "name": "Header"},
    )
    raw_token = signup_resp.cookies.get("refresh_token")

    # Clear cookie from client to test header fallback
    client.cookies.clear()

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        headers={"X-Refresh-Token": raw_token},
    )
    assert refresh_resp.status_code == 200
    assert "access_token" in refresh_resp.json()["tokens"]


def test_refresh_missing_token(client):
    """Verify refresh request without cookie or header returns 401."""
    client.cookies.clear()
    resp = client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "MISSING_REFRESH_TOKEN"


def test_refresh_invalid_or_garbage_token(client):
    """Verify refresh request with garbage token returns 401."""
    client.cookies.set("refresh_token", "invalid_garbage_token_hex_string_12345")
    resp = client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "INVALID_REFRESH_TOKEN"


# ============================================================================
# 6. Logout Flow
# ============================================================================


def test_logout_revokes_refresh_token_and_clears_cookie(client):
    """Verify logout revokes the server-side refresh token and clears cookie."""
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "logout@example.com", "password": "StrongPassword123!", "name": "Logout"},
    )
    refresh_token = signup_resp.cookies.get("refresh_token")
    client.cookies.set("refresh_token", refresh_token)

    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    # Attempting to refresh using the logged-out token must fail
    client.cookies.set("refresh_token", refresh_token)
    post_logout_refresh = client.post("/api/v1/auth/refresh")
    assert post_logout_refresh.status_code == 401
    assert post_logout_refresh.json()["detail"]["error"]["code"] == "INVALID_REFRESH_TOKEN"


def test_logout_without_cookie_is_idempotent(client):
    """Verify logout without cookie succeeds gracefully."""
    client.cookies.clear()
    resp = client.post("/api/v1/auth/logout")
    assert resp.status_code == 200


# ============================================================================
# 7. End-to-End Transparent Refresh Simulation
# ============================================================================


def test_end_to_end_transparent_refresh_workflow(client):
    """Simulate frontend client transparent refresh workflow:
    1. Make API call with expired access token -> receives 401.
    2. Intercept 401 -> call /api/v1/auth/refresh using HttpOnly cookie.
    3. Update access token -> retry original request -> succeeds with 200.
    """
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "client@example.com", "password": "StrongPassword123!", "name": "Client"},
    )
    user_id = signup_resp.json()["user"]["id"]
    refresh_cookie = signup_resp.cookies.get("refresh_token")
    client.cookies.set("refresh_token", refresh_cookie)

    # 1. Simulate an expired access token
    expired_payload = {
        "sub": user_id,
        "email": "client@example.com",
        "type": "access",
        "iat": int(time.time()) - 3600,
        "exp": int(time.time()) - 60,
    }
    expired_token = jwt.encode(expired_payload, settings.jwt_secret, algorithm="HS256")

    # Call protected endpoint -> returns 401
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401

    # 2. Client calls /refresh
    refresh_resp = client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    new_access_token = refresh_resp.json()["tokens"]["access_token"]

    # 3. Client retries original request with new access token -> returns 200
    retry_resp = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_token}"}
    )
    assert retry_resp.status_code == 200
    assert retry_resp.json()["email"] == "client@example.com"


# ============================================================================
# 8. Cross-User Isolation & Backend RBAC Enforcement
# ============================================================================


def test_cross_user_isolation_on_protected_resources(client):
    """Verify that User A cannot see or modify User B's resources."""
    # Create User A
    user_a = client.post(
        "/api/v1/auth/signup",
        json={"email": "usera@example.com", "password": "StrongPassword123!", "name": "User A"},
    ).json()
    token_a = user_a["tokens"]["access_token"]

    # Create User B
    user_b = client.post(
        "/api/v1/auth/signup",
        json={"email": "userb@example.com", "password": "StrongPassword123!", "name": "User B"},
    ).json()
    token_b = user_b["tokens"]["access_token"]

    # User A creates a private book
    book_resp = client.post(
        "/api/v1/books",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": "User A's Secret Diary", "author": "User A", "total_pages": 200},
    )
    assert book_resp.status_code == 201
    book_id = book_resp.json()["id"]

    # User B attempts to access User A's book -> 404 (isolated)
    get_resp = client.get(
        f"/api/v1/books/{book_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_resp.status_code == 404

    # User B attempts to edit User A's book -> 404
    put_resp = client.put(
        f"/api/v1/books/{book_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Hacked Title", "author": "Hacker", "total_pages": 300},
    )
    assert put_resp.status_code == 404

    # User B attempts to update User A's book progress -> 404
    progress_resp = client.patch(
        f"/api/v1/books/{book_id}/progress",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"current_page": 50},
    )
    assert progress_resp.status_code == 404

    # User B attempts to delete User A's book -> 404
    del_resp = client.delete(
        f"/api/v1/books/{book_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert del_resp.status_code == 404
