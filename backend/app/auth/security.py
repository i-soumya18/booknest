import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import get_settings

settings = get_settings()

# OWASP recommended Argon2 hasher configuration
ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64MB
    parallelism=1,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def generate_raw_token() -> str:
    """Generate cryptographically secure 64-character hex string for refresh token."""
    return secrets.token_hex(32)


def hash_token(raw_token: str) -> str:
    """Hash raw refresh token with SHA-256 for secure server-side storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_access_token(user_id: str, email: str) -> tuple[str, datetime]:
    """Create short-lived JWT access token."""
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.jwt_access_ttl_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, expires_at


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None
