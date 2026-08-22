from app.auth.security import hash_password, verify_password


def test_argon2_hashing():
    password = "StrongPassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(hashed, password) is True
    assert verify_password(hashed, "WrongPassword123!") is False


def test_signup_password_policy_fail(client):
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "user@example.com", "password": "WeakPassword1", "name": "Test User"},
    )
    assert resp.status_code == 422


def test_signup_success(client):
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "signup@example.com",
            "password": "StrongPassword123!",
            "name": "Signup User",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "user" in data
    assert data["user"]["email"] == "signup@example.com"
    assert "tokens" in data
    assert "access_token" in data["tokens"]


def test_signup_rejects_duplicate_email(client):
    client.post(
        "/api/v1/auth/signup",
        json={"email": "dup@example.com", "password": "StrongPassword123!", "name": "User One"},
    )
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "dup@example.com", "password": "StrongPassword123!", "name": "User Two"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_login_rejects_wrong_password(client):
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "wrongpass@example.com",
            "password": "StrongPassword123!",
            "name": "User Pass",
        },
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@example.com", "password": "WrongPassword123!"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_success_and_me_endpoint(client):
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "login@example.com",
            "password": "StrongPassword123!",
            "name": "Login User",
        },
    )
    assert signup_resp.status_code == 201

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "StrongPassword123!"},
    )
    assert login_resp.status_code == 200
    access_token = login_resp.json()["tokens"]["access_token"]

    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "login@example.com"


def test_protected_route_unauthenticated(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_refresh_token_rotation_and_logout(client):
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "refresh@example.com",
            "password": "StrongPassword123!",
            "name": "Refresh User",
        },
    )
    assert signup_resp.status_code == 201
    cookie_token = signup_resp.cookies.get("refresh_token")

    refresh_resp = client.post("/api/v1/auth/refresh", cookies={"refresh_token": cookie_token})
    assert refresh_resp.status_code == 200
    new_access_token = refresh_resp.json()["tokens"]["access_token"]
    assert isinstance(new_access_token, str)
    new_cookie_token = refresh_resp.cookies.get("refresh_token")
    assert new_cookie_token != cookie_token

    old_refresh_resp = client.post("/api/v1/auth/refresh", cookies={"refresh_token": cookie_token})
    assert old_refresh_resp.status_code == 401

    logout_resp = client.post("/api/v1/auth/logout", cookies={"refresh_token": new_cookie_token})
    assert logout_resp.status_code == 200

    post_logout_refresh = client.post(
        "/api/v1/auth/refresh", cookies={"refresh_token": new_cookie_token}
    )
    assert post_logout_refresh.status_code == 401
