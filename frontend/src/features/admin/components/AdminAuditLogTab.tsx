"use client";

import { useEffect, useState } from "react";
import { AdminAuditLogItem, listAdminAuditLogs } from "@/features/admin";
import { Spinner, useToast } from "@/components/ui";

export function AdminAuditLogTab() {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { error: toastError } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await listAdminAuditLogs();
      setLogs(data);
    } catch (err) {
      toastError("Failed to fetch audit log", err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "USER_DEACTIVATED":
        return { color: "#f87171", bg: "rgba(239, 68, 68, 0.15)", icon: "🚫" };
      case "USER_REACTIVATED":
        return { color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", icon: "✅" };
      case "PASSWORD_RESET":
        return { color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)", icon: "🔑" };
      case "FILE_DELETED":
        return { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", icon: "🗑️" };
      case "SETTINGS_CHANGED":
        return { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", icon: "⚙️" };
      default:
        return { color: "#cbd5e1", bg: "rgba(255, 255, 255, 0.1)", icon: "📝" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            System Audit Trail
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
            Append-only security log tracking all administrative interventions, overrides, and setting changes.
          </p>
        </div>

        <button onClick={fetchLogs} disabled={loading} className="btn btn-secondary btn-sm">
          {loading ? <Spinner /> : "🔄"} Refresh Logs
        </button>
      </div>

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
        {loading && logs.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-muted)" }}>
            No administrative audit log entries recorded yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(30, 41, 59, 0.6)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Timestamp</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Action</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Admin</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Details</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => {
                const badge = getActionBadge(entry.action);
                return (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "background 0.15s ease",
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-muted)", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          background: badge.bg,
                          color: badge.color,
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        <span>{badge.icon}</span>
                        <span>{entry.action}</span>
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#ffffff", fontWeight: 500 }}>
                      {entry.admin_email || "Admin"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-secondary)", fontSize: "12px" }}>
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: "monospace",
                          fontSize: "11px",
                          background: "rgba(0, 0, 0, 0.25)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          maxWidth: "400px",
                          overflowX: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {JSON.stringify(entry.details, null, 1)}
                      </pre>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-muted)", fontSize: "12px" }}>
                      {entry.ip_address || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
