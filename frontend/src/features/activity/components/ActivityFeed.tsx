"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityEvent, PaginatedResponse } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getActivityFeed } from "../api";

export function ActivityFeed() {
  const [data, setData] = useState<PaginatedResponse<ActivityEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getActivityFeed(page, 15);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity feed.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useWebSocket(
    useCallback(
      (_event: any) => {
        fetchEvents();
      },
      [fetchEvents]
    )
  );

  const renderEventDescription = (event: ActivityEvent) => {
    const p = event.payload || {};
    const eventType = event.event_type || event.eventType || "EVENT";
    switch (eventType) {
      case "BOOK_ADDED":
        return <>📖 Added book <strong>&quot;{p.title || "Untitled"}&quot;</strong> ({p.author || "Unknown"})</>;
      case "BOOK_STATUS_CHANGED":
        return <>🔄 Changed status of <strong>&quot;{p.title || "Book"}&quot;</strong> to <em>{p.new_status?.replace(/_/g, " ")}</em></>;
      case "BOOK_PROGRESS_UPDATED":
        return <>📊 Progress updated for <strong>&quot;{p.title || "Book"}&quot;</strong> to {p.current_page} / {p.total_pages} pages ({p.progress_percentage}%)</>;
      case "SHELF_CREATED":
        return <>📁 Created shelf <strong>&quot;{p.name || "Untitled"}&quot;</strong></>;
      case "SHELF_DELETED":
        return <>🗑️ Deleted shelf <strong>&quot;{p.name || "Shelf"}&quot;</strong></>;
      case "BOOK_ADDED_TO_SHELF":
        return <>📌 Added <strong>&quot;{p.book_title}&quot;</strong> to shelf <strong>&quot;{p.shelf_name}&quot;</strong></>;
      case "BOOK_REMOVED_FROM_SHELF":
        return <>📤 Removed <strong>&quot;{p.book_title}&quot;</strong> from shelf <strong>&quot;{p.shelf_name}&quot;</strong></>;
      case "SHELF_SHARED":
        return <>🤝 Shared shelf <strong>&quot;{p.shelf_name}&quot;</strong> with {p.collaborator_name || p.collaborator_email} ({p.role})</>;
      case "COLLABORATOR_ROLE_CHANGED":
        return <>🛠️ Changed collaborator role on shelf <strong>&quot;{p.shelf_name}&quot;</strong> to {p.new_role}</>;
      case "COLLABORATOR_REMOVED":
        return <>🚪 Removed collaborator from shelf <strong>&quot;{p.shelf_name}&quot;</strong></>;
      case "BOOK_LENT":
        return <>🤝 Lent <strong>&quot;{p.book_title}&quot;</strong> to {p.borrower_name || p.borrower_email}</>;
      case "BOOK_RETURNED":
        return <>↩️ Book <strong>&quot;{p.book_title}&quot;</strong> returned</>;
      default:
        return <>{eventType.replace(/_/g, " ")}</>;
    }
  };


  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          ⚡ Activity Log
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Reverse-chronological log of domain actions across books, shelves, collaborators, and lending.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "#ef444415",
            border: "1px solid #ef444440",
            color: "var(--error-color)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={fetchEvents}
            style={{
              padding: "0.35rem 0.75rem",
              background: "var(--error-color)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          Loading activity log...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--bg-surface)",
            border: "1px dashed var(--border-color)",
            borderRadius: "8px",
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No activity recorded yet</p>
          <p style={{ fontSize: "0.875rem" }}>Actions like adding books, sharing shelves, and lending will appear here.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
            {data.items.map((event) => (
              <div
                key={event.id}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  {renderEventDescription(event)}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap", marginLeft: "1rem" }}>
                  {new Date(event.created_at || event.createdAt || Date.now()).toLocaleString()}
                </div>

              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", alignItems: "center" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Page {page} of {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
