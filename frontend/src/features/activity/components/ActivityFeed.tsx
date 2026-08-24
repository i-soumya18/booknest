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
    <div style={{ padding: "var(--space-6) 0" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontSize: "var(--font-size-h1)", color: "var(--color-text-tertiary)", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "var(--space-2)" }}>
          ⚡ Activity Log
        </h1>
        <p style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-4xl)" }}>
          Reverse-chronological stream of domain actions across books, shelves, collaborators, and lending.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "var(--color-error-bg)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "var(--color-error)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={fetchEvents}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "var(--color-error)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "var(--font-size-2xl)",
              fontWeight: 600,
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--color-text-secondary)" }}>
          Loading activity stream...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--color-surface-raised)",
            border: "1px dashed var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-secondary)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-h3)", color: "var(--color-text-tertiary)", marginBottom: "var(--space-2)", fontWeight: 600 }}>No activity recorded yet</p>
          <p style={{ fontSize: "var(--font-size-3xl)" }}>Actions like adding books, sharing shelves, and lending will appear here in real-time.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
            {data.items.map((event) => (
              <div
                key={event.id}
                className="design-card"
                style={{
                  padding: "var(--space-4) var(--space-6)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "var(--space-4)",
                }}
              >
                <div style={{ fontSize: "var(--font-size-3xl)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
                  {renderEventDescription(event)}
                </div>
                <div style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                  {new Date(event.created_at || event.createdAt || Date.now()).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Server-Side Pagination */}
          <div
            className="design-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-4)",
              padding: "var(--space-4) var(--space-6)",
            }}
          >
            <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-2xl)" }}>
              Page <strong style={{ color: "var(--color-text-tertiary)" }}>{data.page}</strong> of <strong style={{ color: "var(--color-text-tertiary)" }}>{data.totalPages}</strong> ({data.total} total events)
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-surface-base)",
                  color: page <= 1 ? "var(--color-text-inverse)" : "var(--color-text-tertiary)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 600,
                  transition: "all var(--motion-fast)",
                }}
              >
                ← Previous
              </button>

              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-surface-base)",
                  color: page >= data.totalPages ? "var(--color-text-inverse)" : "var(--color-text-tertiary)",
                  cursor: page >= data.totalPages ? "not-allowed" : "pointer",
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 600,
                  transition: "all var(--motion-fast)",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
