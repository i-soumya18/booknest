from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import (
    create_access_token,
    generate_raw_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.config import get_settings
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthSuccessResponse, SignUpRequest, TokenResponse, UserResponse

settings = get_settings()


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def signup(
        self,
        request: SignUpRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[AuthSuccessResponse, str]:
        existing_user = await self.user_repo.get_by_email(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "EMAIL_ALREADY_EXISTS",
                        "message": "Email is already registered",
                    }
                },
            )

        hashed_pwd = hash_password(request.password)
        user = await self.user_repo.create_user(
            email=request.email,
            password_hash=hashed_pwd,
            name=request.name,
        )

        access_token, expires_at = create_access_token(str(user.id), user.email)
        raw_refresh_token = generate_raw_token()
        refresh_hash = hash_token(raw_refresh_token)

        refresh_expires_at = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_ttl_days)
        await self.user_repo.create_refresh_token(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.session.commit()

        user_resp = UserResponse.model_validate(user)
        token_resp = TokenResponse(
            access_token=access_token,
            expires_in=settings.jwt_access_ttl_minutes * 60,
        )
        return AuthSuccessResponse(user=user_resp, tokens=token_resp), raw_refresh_token

    async def login(
        self,
        email: str,
        password: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[AuthSuccessResponse, str]:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(user.password_hash, password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"}
                },
            )

        access_token, expires_at = create_access_token(str(user.id), user.email)
        raw_refresh_token = generate_raw_token()
        refresh_hash = hash_token(raw_refresh_token)

        refresh_expires_at = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_ttl_days)
        await self.user_repo.create_refresh_token(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.session.commit()

        user_resp = UserResponse.model_validate(user)
        token_resp = TokenResponse(
            access_token=access_token,
            expires_in=settings.jwt_access_ttl_minutes * 60,
        )
        return AuthSuccessResponse(user=user_resp, tokens=token_resp), raw_refresh_token

    async def refresh_tokens(
        self,
        raw_refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[AuthSuccessResponse, str]:
        if not raw_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "MISSING_REFRESH_TOKEN",
                        "message": "Refresh token is missing",
                    }
                },
            )

        token_hash = hash_token(raw_refresh_token)
        token_record = await self.user_repo.get_refresh_token_by_hash(token_hash)
        now = datetime.now(UTC)

        if token_record and token_record.expires_at.tzinfo is None:
            token_record.expires_at = token_record.expires_at.replace(tzinfo=UTC)

        if not token_record or token_record.revoked_at is not None or token_record.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "INVALID_REFRESH_TOKEN",
                        "message": "Invalid, expired, or revoked refresh token",
                    }
                },
            )

        user = await self.user_repo.get_by_id(token_record.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {"code": "USER_NOT_FOUND", "message": "Associated user not found"}
                },
            )

        # Rotate token: Revoke current refresh token
        await self.user_repo.revoke_refresh_token(token_record.id)

        # Generate new tokens
        new_access_token, _ = create_access_token(str(user.id), user.email)
        new_raw_refresh_token = generate_raw_token()
        new_refresh_hash = hash_token(new_raw_refresh_token)

        new_refresh_expires_at = now + timedelta(days=settings.jwt_refresh_ttl_days)
        await self.user_repo.create_refresh_token(
            user_id=user.id,
            token_hash=new_refresh_hash,
            expires_at=new_refresh_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.session.commit()

        user_resp = UserResponse.model_validate(user)
        token_resp = TokenResponse(
            access_token=new_access_token,
            expires_in=settings.jwt_access_ttl_minutes * 60,
        )
        return AuthSuccessResponse(user=user_resp, tokens=token_resp), new_raw_refresh_token

    async def logout(self, raw_refresh_token: str | None) -> None:
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            token_record = await self.user_repo.get_refresh_token_by_hash(token_hash)
            if token_record and token_record.revoked_at is None:
                await self.user_repo.revoke_refresh_token(token_record.id)
                await self.session.commit()
