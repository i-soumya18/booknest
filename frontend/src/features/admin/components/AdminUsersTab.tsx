"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AdminUserDetail,
  AdminUserListItem,
  getAdminUserDetail,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from "@/features/admin";
import { useAuth } from "@/features/auth";
import { Spinner, useToast } from "@/components/ui";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function AdminUsersTab() {
  const { user: currentAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserListItem | null>(null);
  const [customPassword, setCustomPassword] = useState("");
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // User Detail Modal
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Deactivate/Reactivate Action state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = async (query = search) => {
    setLoading(true);
    try {
      const data = await listAdminUsers(query || undefined);
      setUsers(data);
    } catch (err) {
      toastError("Failed to load users", err instanceof Error ? err.message : "Error fetching user list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    startTransition(() => {
      fetchUsers(val);
    });
  };

  const handleToggleStatus = async (user: AdminUserListItem) => {
    if (user.id === currentAdmin?.id) {
      toastError("Self-deactivation forbidden", "Administrators cannot deactivate their own account.");
      return;
    }
    const newStatus = !user.is_active;
    const confirmAction = window.confirm(
      `Are you sure you want to ${newStatus ? "reactivate" : "deactivate"} ${user.name} (${user.email})?`
    );
    if (!confirmAction) return;

    setActionLoadingId(user.id);
    try {
      const updated = await updateAdminUser(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      success(
        `User ${newStatus ? "Reactivated" : "Deactivated"}`,
        `${user.name}'s account is now ${newStatus ? "active" : "deactivated"}.`
      );
    } catch (err) {
      toastError("Status update failed", err instanceof Error ? err.message : "Could not update user status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenResetModal = (user: AdminUserListItem) => {
    setResetTargetUser(user);
    setCustomPassword("");
    setResetResult(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetTargetUser) return;
    setResetting(true);
    try {
      const resp = await resetAdminUserPassword(
        resetTargetUser.id,
        customPassword.trim() ? customPassword.trim() : undefined
      );
      setResetResult(resp.temporary_password);
      success("Password Reset Successful", "Temporary password generated.");
    } catch (err) {
      toastError("Reset failed", err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleViewDetail = async (userId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getAdminUserDetail(userId);
      setDetailUser(detail);
    } catch (err) {
      toastError("Failed to fetch user details", err instanceof Error ? err.message : "Error");
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header & Filter Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            User Management & Access Control
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
            Search, inspect activity, toggle account access, or reset user credentials.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            aria-label="Search users"
            className="input"
            style={{
              padding: "0.45rem 0.85rem",
              fontSize: "13px",
              width: "260px",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              color: "#ffffff",
            }}
          />
          <button onClick={() => fetchUsers()} className="btn btn-secondary btn-sm">
            {loading ? <Spinner /> : "🔄"}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div
        className="design-card"
        style={{
          padding: 0,
          overflowX: "auto",
          background: "rgba(15, 23, 42, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {loading && users.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-muted)" }}>
            No users match the search criteria.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(30, 41, 59, 0.6)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Name</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Email</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Books</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Shelves</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Storage</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Joined</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentAdmin?.id;
                const isActionBusy = actionLoadingId === u.id;
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "background 0.15s ease",
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#ffffff" }}>
                      {u.name} {isSelf && <span style={{ fontSize: "10px", color: "var(--color-accent-primary)" }}>(You)</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-secondary)" }}>
                      {u.email}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {u.is_active ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#34d399",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                          Active
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(239, 68, 68, 0.12)",
                            color: "#f87171",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171" }} />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#ffffff" }}>{u.books_count}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#ffffff" }}>{u.shelves_count}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-muted)" }}>
                      {formatBytes(u.storage_used_bytes)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-muted)", fontSize: "12px" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                        <button
                          onClick={() => handleViewDetail(u.id)}
                          className="btn btn-ghost btn-xs"
                          title="View user analytics and recent events"
                        >
                          🔍 View
                        </button>

                        <button
                          onClick={() => handleOpenResetModal(u)}
                          className="btn btn-secondary btn-xs"
                          title="Reset user password"
                        >
                          🔑 Reset
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf || isActionBusy}
                          className={`btn btn-xs ${u.is_active ? "btn-danger" : "btn-secondary"}`}
                          title={isSelf ? "You cannot deactivate your own admin account" : u.is_active ? "Deactivate user" : "Reactivate user"}
                          style={{
                            opacity: isSelf ? 0.4 : 1,
                            cursor: isSelf ? "not-allowed" : "pointer",
                          }}
                        >
                          {isActionBusy ? <Spinner /> : u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="design-card"
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#0f172a",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Reset Password: {resetTargetUser.name}
              </h3>
              <button
                onClick={() => setResetTargetUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
              Specify a new password or leave blank to automatically generate a secure 16-character temporary password.
            </p>

            {!resetResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>
                    Custom Password (Optional, min 8 chars)
                  </label>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave empty for auto-generated password"
                    className="input"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      fontSize: "13px",
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid var(--color-border-default)",
                      borderRadius: "var(--radius-md)",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button onClick={() => setResetTargetUser(null)} className="btn btn-ghost btn-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmResetPassword}
                    disabled={resetting}
                    className="btn btn-primary btn-sm"
                  >
                    {resetting ? <Spinner /> : "Confirm Reset"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#34d399", fontWeight: 600, marginBottom: "4px" }}>
                    Password successfully reset! Provide this temporary password to the user:
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#ffffff",
                      background: "rgba(0, 0, 0, 0.4)",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      letterSpacing: "0.05em",
                      userSelect: "all",
                    }}
                  >
                    {resetResult}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setResetTargetUser(null)} className="btn btn-secondary btn-sm">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {detailUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="design-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#0f172a",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  {detailUser.name}
                </h3>
                <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                  {detailUser.email}
                </span>
              </div>
              <button
                onClick={() => setDetailUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Books Tracked</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>{detailUser.books_count}</div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Shelves Created</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>{detailUser.shelves_count}</div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Storage Used</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>{formatBytes(detailUser.storage_used_bytes)}</div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
                Recent Activities (Last 10 Events)
              </h4>
              {detailUser.recent_activity.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>No recorded activity events yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {detailUser.recent_activity.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        fontSize: "12px",
                        padding: "6px 10px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--color-accent-primary)" }}>
                        {ev.event_type}
                      </span>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setDetailUser(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
