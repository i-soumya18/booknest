import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, require_admin
from app.models.user import User
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminAuditLogItem,
    AdminFileItem,
    AdminResetPasswordRequest,
    AdminResetPasswordResponse,
    AdminSettingItem,
    AdminSettingUpdate,
    AdminUserDetailResponse,
    AdminUserListItem,
    AdminUserUpdate,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/announcement",
    status_code=status.HTTP_200_OK,
)
async def get_announcement(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    service = AdminService(session)
    banner = await service.get_setting("announcement_banner", default="")
    return {"announcement": str(banner or "")}


@router.get(
    "/analytics",
    response_model=AdminAnalyticsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_analytics(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAnalyticsResponse:
    service = AdminService(session)
    return await service.get_analytics()


@router.get(
    "/users",
    response_model=list[AdminUserListItem],
    status_code=status.HTTP_200_OK,
)
async def list_users(
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminUserListItem]:
    service = AdminService(session)
    return await service.list_users(search=search, skip=skip, limit=limit)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    status_code=status.HTTP_200_OK,
)
async def get_user_detail(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserDetailResponse:
    service = AdminService(session)
    return await service.get_user_detail(user_id)


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserListItem,
    status_code=status.HTTP_200_OK,
)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserListItem:
    service = AdminService(session)
    client_ip = request.client.host if request.client else None
    return await service.set_user_active(
        admin=admin,
        target_user_id=user_id,
        is_active=payload.is_active,
        ip_address=client_ip,
    )


@router.post(
    "/users/{user_id}/reset-password",
    response_model=AdminResetPasswordResponse,
    status_code=status.HTTP_200_OK,
)
async def reset_user_password(
    user_id: uuid.UUID,
    payload: AdminResetPasswordRequest,
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminResetPasswordResponse:
    service = AdminService(session)
    client_ip = request.client.host if request.client else None
    temp_pwd = await service.reset_user_password(
        admin=admin,
        target_user_id=user_id,
        new_password=payload.new_password,
        ip_address=client_ip,
    )
    return AdminResetPasswordResponse(
        message="Password has been successfully reset",
        temporary_password=temp_pwd,
    )


@router.get(
    "/moderation/files",
    response_model=list[AdminFileItem],
    status_code=status.HTTP_200_OK,
)
async def list_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminFileItem]:
    service = AdminService(session)
    return await service.list_files(skip=skip, limit=limit)


@router.delete(
    "/moderation/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_file(
    file_id: uuid.UUID,
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    service = AdminService(session)
    client_ip = request.client.host if request.client else None
    await service.delete_file(admin=admin, file_id=file_id, ip_address=client_ip)


@router.get(
    "/settings",
    response_model=list[AdminSettingItem],
    status_code=status.HTTP_200_OK,
)
async def get_settings(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminSettingItem]:
    service = AdminService(session)
    return await service.get_settings_list()


@router.patch(
    "/settings",
    response_model=AdminSettingItem,
    status_code=status.HTTP_200_OK,
)
async def update_setting(
    payload: AdminSettingUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSettingItem:
    service = AdminService(session)
    client_ip = request.client.host if request.client else None
    return await service.update_setting(
        admin=admin,
        key=payload.key,
        value=payload.value,
        ip_address=client_ip,
    )


@router.get(
    "/audit-log",
    response_model=list[AdminAuditLogItem],
    status_code=status.HTTP_200_OK,
)
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminAuditLogItem]:
    service = AdminService(session)
    return await service.list_audit_logs(skip=skip, limit=limit)
