"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityEvent, PaginatedResponse } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getActivityFeed } from "../api";
import { Skeleton, SkeletonCard, ErrorBanner, useToast } from "@/components/ui";

type DomainFilter = "ALL" | "BOOKS" | "SHELVES" | "LENDING" | "COLLABORATORS";

export function ActivityFeed() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<ActivityEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterDomain, setFilterDomain] = useState<DomainFilter>("ALL");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getActivityFeed(page, 20);
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
      (event: any) => {
        fetchEvents();
        toast({
          title: "⚡ Live Domain Activity",
          description: event.event_type ? event.event_type.replace(/_/g, " ") : "New activity recorded",
          type: "info",
        });
      },
      [fetchEvents, toast]
    )
  );

  const getEventCategory = (eventType: string): DomainFilter => {
    if (eventType.startsWith("BOOK_LENT") || eventType.startsWith("BOOK_RETURNED")) return "LENDING";
    if (eventType.startsWith("BOOK_")) return "BOOKS";
    if (eventType.startsWith("SHELF_") || eventType.includes("TO_SHELF") || eventType.includes("FROM_SHELF")) return "SHELVES";
    if (eventType.startsWith("COLLABORATOR_") || eventType === "SHELF_SHARED") return "COLLABORATORS";
    return "ALL";
  };

  const getEventIconAndTag = (eventType: string) => {
    switch (eventType) {
      case "BOOK_ADDED":
        return { icon: "📖", tag: "Book Added", badgeClass: "badge-reading" };
      case "BOOK_STATUS_CHANGED":
        return { icon: "🔄", tag: "Status Change", badgeClass: "badge-finished" };
      case "BOOK_PROGRESS_UPDATED":
        return { icon: "📊", tag: "Progress", badgeClass: "badge-want" };
      case "SHELF_CREATED":
        return { icon: "📁", tag: "Shelf Created", badgeClass: "badge-owner" };
      case "SHELF_DELETED":
        return { icon: "🗑️", tag: "Shelf Deleted", badgeClass: "badge-lent" };
      case "BOOK_ADDED_TO_SHELF":
        return { icon: "📌", tag: "Shelf Book", badgeClass: "badge-editor" };
      case "BOOK_REMOVED_FROM_SHELF":
        return { icon: "📤", tag: "Shelf Book", badgeClass: "badge-viewer" };
      case "SHELF_SHARED":
        return { icon: "🤝", tag: "Shelf Shared", badgeClass: "badge-owner" };
      case "COLLABORATOR_ROLE_CHANGED":
        return { icon: "🛠️", tag: "RBAC Change", badgeClass: "badge-editor" };
      case "COLLABORATOR_REMOVED":
        return { icon: "🚪", tag: "Collab Removed", badgeClass: "badge-lent" };
      case "BOOK_LENT":
        return { icon: "🤝", tag: "Lending Active", badgeClass: "badge-lent" };
      case "BOOK_RETURNED":
        return { icon: "↩️", tag: "Book Returned", badgeClass: "badge-finished" };
      default:
        return { icon: "⚡", tag: "Event", badgeClass: "badge-viewer" };
    }
  };

  const renderEventDescription = (event: ActivityEvent) => {
    const p = event.payload || {};
    const eventType = event.event_type || event.eventType || "EVENT";
    switch (eventType) {
      case "BOOK_ADDED":
        return <>Added book <strong style={{ color: "#ffffff" }}>&quot;{p.title || "Untitled"}&quot;</strong> by {p.author || "Unknown"}</>;
      case "BOOK_STATUS_CHANGED":
        return <>Status updated on <strong style={{ color: "#ffffff" }}>&quot;{p.title || "Book"}&quot;</strong> to <span style={{ color: "#38bdf8", fontWeight: 600 }}>{p.new_status?.replace(/_/g, " ")}</span></>;
      case "BOOK_PROGRESS_UPDATED":
        return <>Progress on <strong style={{ color: "#ffffff" }}>&quot;{p.title || "Book"}&quot;</strong> updated to <strong style={{ color: "#38bdf8" }}>{p.current_page}/{p.total_pages} pages ({p.progress_percentage}%)</strong></>;
      case "SHELF_CREATED":
        return <>Created collection shelf <strong style={{ color: "#ffffff" }}>&quot;{p.name || "Untitled"}&quot;</strong></>;
      case "SHELF_DELETED":
        return <>Deleted collection shelf <strong style={{ color: "#ffffff" }}>&quot;{p.name || "Shelf"}&quot;</strong></>;
      case "BOOK_ADDED_TO_SHELF":
        return <>Added <strong style={{ color: "#ffffff" }}>&quot;{p.book_title}&quot;</strong> to shelf <strong style={{ color: "#a855f7" }}>&quot;{p.shelf_name}&quot;</strong></>;
      case "BOOK_REMOVED_FROM_SHELF":
        return <>Removed <strong style={{ color: "#ffffff" }}>&quot;{p.book_title}&quot;</strong> from shelf <strong style={{ color: "#a855f7" }}>&quot;{p.shelf_name}&quot;</strong></>;
      case "SHELF_SHARED":
        return <>Shared shelf <strong style={{ color: "#ffffff" }}>&quot;{p.shelf_name}&quot;</strong> with <strong style={{ color: "#38bdf8" }}>{p.collaborator_name || p.collaborator_email}</strong> as {p.role}</>;
      case "COLLABORATOR_ROLE_CHANGED":
        return <>Updated collaborator role on <strong style={{ color: "#ffffff" }}>&quot;{p.shelf_name}&quot;</strong> to <strong style={{ color: "#38bdf8" }}>{p.new_role}</strong></>;
      case "COLLABORATOR_REMOVED":
        return <>Removed collaborator access from shelf <strong style={{ color: "#ffffff" }}>&quot;{p.shelf_name}&quot;</strong></>;
      case "BOOK_LENT":
        return <>Lent book <strong style={{ color: "#ffffff" }}>&quot;{p.book_title}&quot;</strong> to <strong style={{ color: "#fb923c" }}>{p.borrower_name || p.borrower_email}</strong></>;
      case "BOOK_RETURNED":
        return <>Book returned: <strong style={{ color: "#ffffff" }}>&quot;{p.book_title}&quot;</strong> is back in library</>;
      default:
        return <>{eventType.replace(/_/g, " ")}</>;
    }
  };

  const filteredItems = (data?.items || []).filter((event) => {
    if (filterDomain === "ALL") return true;
    const cat = getEventCategory(event.event_type || event.eventType || "");
    return cat === filterDomain;
  });

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header Banner */}
      <div
        className="design-card"
        style={{
          padding: "24px 28px",
          marginBottom: "24px",
          background: "linear-gradient(135deg, rgba(17, 29, 51, 0.9) 0%, rgba(13, 21, 36, 0.95) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>⚡</span>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Domain Activity Audit Log
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="live-dot" />
            <span style={{ fontSize: "12px", color: "#34d399", fontWeight: 700 }}>Real-Time Stream Active</span>
          </div>
        </div>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
          Immutable reverse-chronological audit trail capturing state changes across Books, Shelves, Collaborators, and Lending concurrency transactions.
        </p>
      </div>

      {/* Domain Category Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 600, marginRight: "4px" }}>Category:</span>
        {[
          { id: "ALL", label: "⚡ All Activity" },
          { id: "BOOKS", label: "📚 Books" },
          { id: "SHELVES", label: "📁 Shelves" },
          { id: "LENDING", label: "🤝 Lending" },
          { id: "COLLABORATORS", label: "👥 Collaborators" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterDomain(tab.id as DomainFilter)}
            className="btn btn-xs"
            style={{
              background: filterDomain === tab.id ? "rgba(56, 189, 248, 0.18)" : "transparent",
              color: filterDomain === tab.id ? "#38bdf8" : "var(--color-text-secondary)",
              border: filterDomain === tab.id ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-full)",
              fontWeight: filterDomain === tab.id ? 700 : 500,
              padding: "4px 12px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: "20px" }}>
          <ErrorBanner message={error} onRetry={fetchEvents} />
        </div>
      )}

      {/* Loading Skeleton List */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }} aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard
              key={i}
              className="design-card"
              style={{
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Skeleton className="skeleton-text" width={`${50 + (i % 4) * 10}%`} />
              <Skeleton className="skeleton-text" width="90px" />
            </SkeletonCard>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "var(--color-surface-raised)",
            border: "1px dashed var(--color-border-default)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⚡</div>
          <p style={{ fontSize: "18px", color: "#ffffff", marginBottom: "6px", fontWeight: 700 }}>
            No activity found
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
            {filterDomain === "ALL"
              ? "Actions like adding books, sharing shelves, and lending will appear here in real-time."
              : `No activity found under the "${filterDomain.toLowerCase()}" category.`}
          </p>
        </div>
      )}

      {/* Success State */}
      {!loading && !error && filteredItems.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            {filteredItems.map((event) => {
              const eventType = event.event_type || event.eventType || "EVENT";
              const { icon, tag, badgeClass } = getEventIconAndTag(eventType);
              const createdAt = new Date(event.created_at || event.createdAt || Date.now());

              return (
                <div
                  key={event.id}
                  className="design-card"
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "14px",
                    flexWrap: "wrap",
                    background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 320px" }}>
                    <span style={{ fontSize: "20px" }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: "13.5px", color: "var(--color-text-primary)", lineHeight: 1.4 }}>
                        {renderEventDescription(event)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {tag}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                    {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Server-Side Pagination */}
          {data && data.totalPages > 1 && (
            <div
              className="design-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                padding: "12px 20px",
              }}
            >
              <div style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
                Page <strong style={{ color: "#ffffff" }}>{data.page}</strong> of <strong style={{ color: "#ffffff" }}>{data.totalPages}</strong> ({data.total} total audit records)
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="btn btn-secondary btn-xs"
                >
                  ← Previous
                </button>

                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="btn btn-secondary btn-xs"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

