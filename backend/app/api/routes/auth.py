from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.config import get_settings
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import AuthSuccessResponse, LoginRequest, SignUpRequest, UserResponse
from app.services.auth_service import AuthService

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        httponly=True,
        max_age=settings.jwt_refresh_ttl_days * 86400,
        path="/api/v1/auth",
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
    )


@router.post("/signup", response_model=AuthSuccessResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    request_data: SignUpRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> AuthSuccessResponse:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    service = AuthService(session)
    result, raw_refresh_token = await service.signup(
        request=request_data,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    _set_refresh_cookie(response, raw_refresh_token)
    return result


@router.post("/login", response_model=AuthSuccessResponse)
async def login(
    request_data: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> AuthSuccessResponse:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    service = AuthService(session)
    result, raw_refresh_token = await service.login(
        email=request_data.email,
        password=request_data.password,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    _set_refresh_cookie(response, raw_refresh_token)
    return result


@router.post("/refresh", response_model=AuthSuccessResponse)
async def refresh_tokens(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> AuthSuccessResponse:
    # Accept cookie or fallback to header/body
    token = refresh_token or request.headers.get("X-Refresh-Token")
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    service = AuthService(session)
    result, new_raw_refresh_token = await service.refresh_tokens(
        raw_refresh_token=token or "",
        user_agent=user_agent,
        ip_address=ip_address,
    )
    _set_refresh_cookie(response, new_raw_refresh_token)
    return result


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    service = AuthService(session)
    await service.logout(refresh_token)
    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
