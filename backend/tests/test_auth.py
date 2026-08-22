import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.dependencies import get_db_session
from app.auth.security import hash_password, verify_password
from app.main import app
from app.models.base import Base

# Setup SQLite in-memory async database for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(autouse=True)
async def prepare_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db_session():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db_session] = override_get_db_session

client = TestClient(app)


def test_argon2_hashing():
    password = "StrongPassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(hashed, password) is True
    assert verify_password(hashed, "WrongPassword123!") is False


def test_signup_password_policy_fail():
    # Weak password - missing special char
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "user@example.com", "password": "WeakPassword1", "name": "Test User"},
    )
    assert resp.status_code == 422


def test_signup_success():
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
    assert "set-cookie" in resp.headers or "refresh_token" in resp.cookies


def test_login_success_and_me_endpoint():
    # 1. Signup
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "login@example.com",
            "password": "StrongPassword123!",
            "name": "Login User",
        },
    )
    assert signup_resp.status_code == 201

    # 2. Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "StrongPassword123!"},
    )
    assert login_resp.status_code == 200
    access_token = login_resp.json()["tokens"]["access_token"]

    # 3. Access protected /me endpoint
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "login@example.com"


def test_protected_route_unauthenticated():
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_refresh_token_rotation_and_logout():
    # 1. Signup
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

    # 2. Refresh tokens
    refresh_resp = client.post("/api/v1/auth/refresh", cookies={"refresh_token": cookie_token})
    assert refresh_resp.status_code == 200
    new_access_token = refresh_resp.json()["tokens"]["access_token"]
    assert isinstance(new_access_token, str)
    new_cookie_token = refresh_resp.cookies.get("refresh_token")

    assert new_cookie_token != cookie_token

    # 3. Old refresh token should now fail (rotated & revoked)
    old_refresh_resp = client.post("/api/v1/auth/refresh", cookies={"refresh_token": cookie_token})
    assert old_refresh_resp.status_code == 401

    # 4. Logout using new refresh token
    logout_resp = client.post("/api/v1/auth/logout", cookies={"refresh_token": new_cookie_token})
    assert logout_resp.status_code == 200

    # 5. Refresh after logout should fail
    post_logout_refresh = client.post(
        "/api/v1/auth/refresh", cookies={"refresh_token": new_cookie_token}
    )
    assert post_logout_refresh.status_code == 401
