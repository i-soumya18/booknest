import { fetchApi } from "@/lib/api/client";

export interface AdminAnalytics {
  total_users: number;
  total_books: number;
  total_books_with_file: number;
  total_storage_bytes: number;
  active_readers_7d: number;
  active_lendings: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  books_count: number;
  shelves_count: number;
  storage_used_bytes: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  books_count: number;
  shelves_count: number;
  storage_used_bytes: number;
  recent_activity: Array<{
    id: string;
    event_type: string;
    payload: Record<string, any>;
    created_at: string;
  }>;
}

export interface AdminFileItem {
  id: string;
  book_id: string;
  book_title: string;
  original_name: string;
  file_size_bytes: number;
  mime_type: string;
  page_count: number | null;
  created_at: string;
  uploader_email: string | null;
}

export interface AdminSettingItem {
  key: string;
  value: any;
  updated_at: string;
  updated_by: string | null;
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  target_user_id: string | null;
  target_file_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  return fetchApi<AdminAnalytics>("/api/v1/admin/analytics");
}

export async function listAdminUsers(search?: string, skip = 0, limit = 50): Promise<AdminUserListItem[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("skip", String(skip));
  params.append("limit", String(limit));
  return fetchApi<AdminUserListItem[]>(`/api/v1/admin/users?${params.toString()}`);
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  return fetchApi<AdminUserDetail>(`/api/v1/admin/users/${userId}`);
}

export async function updateAdminUser(userId: string, isActive: boolean): Promise<AdminUserListItem> {
  return fetchApi<AdminUserListItem>(`/api/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function resetAdminUserPassword(
  userId: string,
  newPassword?: string
): Promise<{ message: string; temporary_password: string }> {
  return fetchApi<{ message: string; temporary_password: string }>(
    `/api/v1/admin/users/${userId}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword || undefined }),
    }
  );
}

export async function listAdminFiles(skip = 0, limit = 50): Promise<AdminFileItem[]> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  return fetchApi<AdminFileItem[]>(`/api/v1/admin/moderation/files?${params.toString()}`);
}

export async function deleteAdminFile(fileId: string): Promise<void> {
  return fetchApi<void>(`/api/v1/admin/moderation/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function getAdminSettings(): Promise<AdminSettingItem[]> {
  return fetchApi<AdminSettingItem[]>("/api/v1/admin/settings");
}

export async function updateAdminSetting(key: string, value: any): Promise<AdminSettingItem> {
  return fetchApi<AdminSettingItem>("/api/v1/admin/settings", {
    method: "PATCH",
    body: JSON.stringify({ key, value }),
  });
}

export async function listAdminAuditLogs(skip = 0, limit = 50): Promise<AdminAuditLogItem[]> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  return fetchApi<AdminAuditLogItem[]>(`/api/v1/admin/audit-log?${params.toString()}`);
}

export async function getPublicAnnouncement(): Promise<{ announcement: string }> {
  return fetchApi<{ announcement: string }>("/api/v1/admin/announcement");
}
