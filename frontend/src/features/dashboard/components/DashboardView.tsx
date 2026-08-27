"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardMetrics, getDashboardMetrics } from "../api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/features/auth";
import { Spinner, Skeleton, SkeletonCard, ErrorBanner, useToast } from "@/components/ui";

export function DashboardView() {
  const { user, loading: authLoading, login } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useWebSocket(
    useCallback(
      (event: any) => {
        fetchMetrics();
        if (event && event.event_type) {
          toast({
            title: `⚡ Live Event: ${event.event_type.replace(/_/g, " ")}`,
            description: "Dashboard updated via real-time WebSocket room",
            type: "info",
            duration: 3000,
          });
        }
      },
      [fetchMetrics, toast]
    )
  );

  const handleQuickLogin = async (email: string) => {
    setLoggingIn(true);
    try {
      await login(email, "Password123!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "55vh", gap: "16px" }}>
        <Spinner size="lg" />
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", fontWeight: 500 }}>
          Authenticating session...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="design-card"
        style={{
          maxWidth: "680px",
          margin: "3rem auto",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px -5px rgba(56, 189, 248, 0.15)",
          background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
        }}
      >
        <div style={{ fontSize: "3.5rem", marginBottom: "16px", filter: "drop-shadow(0 0 16px rgba(56, 189, 248, 0.5))" }}>
          📚
        </div>
        <h2 style={{ fontSize: "28px", marginBottom: "12px", color: "#ffffff", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Welcome to <span className="gradient-text">BookNest</span>
        </h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "15px", lineHeight: 1.6, marginBottom: "28px" }}>
          Production-grade reading tracker with <strong>PostgreSQL concurrency locks</strong>, <strong>FastAPI RBAC</strong> on shared shelves, and <strong>authenticated room WebSockets</strong>.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "32px", flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-primary" style={{ minWidth: "140px" }}>
            Sign In
          </Link>
          <Link href="/signup" className="btn btn-secondary" style={{ minWidth: "140px" }}>
            Create Account
          </Link>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border-default)", paddingTop: "24px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Quick 1-Click Evaluation Personas
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => handleQuickLogin("alice@example.com")}
              disabled={loggingIn}
              className="btn btn-secondary btn-sm"
            >
              {loggingIn ? <Spinner /> : "👑"} Alice (Owner)
            </button>
            <button
              onClick={() => handleQuickLogin("bob@example.com")}
              disabled={loggingIn}
              className="btn btn-secondary btn-sm"
            >
              {loggingIn ? <Spinner /> : "✏️"} Bob (Editor / Borrower)
            </button>
            <button
              onClick={() => handleQuickLogin("charlie@example.com")}
              disabled={loggingIn}
              className="btn btn-secondary btn-sm"
            >
              {loggingIn ? <Spinner /> : "👁️"} Charlie (Viewer)
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: "16px" }}>
            <ErrorBanner message={error} />
          </div>
        )}
      </div>
    );
  }

  // Dashboard Loading State with Shimmer Skeletons
  if (loading && !metrics) {
    return (
      <div style={{ padding: "16px 0" }} aria-label="Loading dashboard" aria-busy="true">
        <div className="section-header">
          <Skeleton className="skeleton-title" width="280px" style={{ marginBottom: "8px" }} />
          <Skeleton className="skeleton-text" width="450px" />
        </div>

        {/* 5-Card Stats Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card" style={{ padding: "20px" }}>
              <Skeleton className="skeleton-text" width="60%" style={{ marginBottom: "12px" }} />
              <Skeleton width="45%" height="36px" />
            </SkeletonCard>
          ))}
        </div>

        {/* 2-Column Row Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <SkeletonCard style={{ padding: "24px" }}>
            <Skeleton className="skeleton-title" width="40%" style={{ marginBottom: "16px" }} />
            <Skeleton className="skeleton-title" width="70%" style={{ marginBottom: "8px" }} />
            <Skeleton className="skeleton-text" width="50%" style={{ marginBottom: "16px" }} />
            <Skeleton width="120px" height="32px" borderRadius="var(--radius-md)" />
          </SkeletonCard>
          <SkeletonCard style={{ padding: "24px" }}>
            <Skeleton className="skeleton-title" width="55%" style={{ marginBottom: "20px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Skeleton height="16px" />
              <Skeleton height="16px" />
              <Skeleton height="16px" />
            </div>
          </SkeletonCard>
        </div>
      </div>
    );
  }

  // Dashboard Error State
  if (error && !metrics) {
    return (
      <div style={{ padding: "16px 0" }}>
        <ErrorBanner message={error} onRetry={fetchMetrics} />
      </div>
    );
  }

  const statusMap = metrics?.books_by_status || {};
  const totalBooks = Object.values(statusMap).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Hero Welcome & Quick Action Bar */}
      <div
        className="design-card"
        style={{
          padding: "24px 28px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, rgba(17, 29, 51, 0.9) 0%, rgba(13, 21, 36, 0.95) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "18px" }}>👋</span>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Hello, {user.name}
            </h1>
            <span className="badge badge-reading" style={{ fontSize: "11px" }}>Active Library</span>
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
            Live metrics and room-scoped activity stream computed directly from PostgreSQL.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/books" className="btn btn-primary btn-sm">
            <span>+</span> Add Book
          </Link>
          <Link href="/shelves" className="btn btn-secondary btn-sm">
            <span>📁</span> New Shelf
          </Link>
          <Link href="/borrowed" className="btn btn-secondary btn-sm">
            <span>🤝</span> Lending Hub
          </Link>
        </div>
      </div>

      {/* 5-Metric Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* Total Books */}
        <div
          className="design-card"
          style={{
            padding: "20px",
            background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
            borderLeft: "3px solid #38bdf8",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "8px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
            <span>📚 Total Books</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>Library</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.03em" }}>
            {totalBooks}
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "10px", fontSize: "11px" }}>
            <span style={{ color: "#38bdf8" }}>{statusMap["READING"] || 0} reading</span>
            <span style={{ color: "var(--color-text-muted)" }}>•</span>
            <span style={{ color: "#34d399" }}>{statusMap["FINISHED"] || 0} read</span>
          </div>
        </div>

        {/* Finished This Year */}
        <div
          className="design-card"
          style={{
            padding: "20px",
            background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
            borderLeft: "3px solid #10b981",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "8px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
            <span>🎯 Finished This Year</span>
            <span style={{ color: "#34d399", fontSize: "11px" }}>Goal Tracker</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "800", color: "#34d399", letterSpacing: "-0.03em" }}>
            {metrics?.books_finished_this_year || 0}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "10px" }}>
            Completed reading goals
          </div>
        </div>

        {/* Average Rating */}
        <div
          className="design-card"
          style={{
            padding: "20px",
            background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
            borderLeft: "3px solid #f59e0b",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "8px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
            <span>⭐ Avg Rating</span>
            <span style={{ color: "#fbbf24", fontSize: "11px" }}>Scored</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "800", color: "#fbbf24", letterSpacing: "-0.03em" }}>
            {metrics?.average_rating !== null && metrics?.average_rating !== undefined
              ? `${metrics.average_rating} / 5`
              : "N/A"}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "10px" }}>
            Across all rated titles
          </div>
        </div>

        {/* Currently Lent Out */}
        <div
          className="design-card"
          style={{
            padding: "20px",
            background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
            borderLeft: "3px solid #a855f7",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "8px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
            <span>🤝 Lent Out</span>
            <span style={{ color: "#c084fc", fontSize: "11px" }}>Safe Index</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "800", color: "#c084fc", letterSpacing: "-0.03em" }}>
            {metrics?.books_currently_lent_out || 0}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "10px" }}>
            Active lending locks
          </div>
        </div>

        {/* Shared Shelves */}
        <div
          className="design-card"
          style={{
            padding: "20px",
            background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
            borderLeft: "3px solid #818cf8",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "8px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
            <span>📂 Shared Shelves</span>
            <span style={{ color: "#818cf8", fontSize: "11px" }}>RBAC Collab</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "800", color: "#818cf8", letterSpacing: "-0.03em" }}>
            {metrics?.shelves_shared_with_user || 0}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "10px" }}>
            Shared with your account
          </div>
        </div>
      </div>

      {/* Top Shelf & Reading Breakdown Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {/* Top Shelf Highlight */}
        <div
          className="design-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", color: "#ffffff", fontWeight: "700" }}>
                🏆 Top Curated Shelf
              </h3>
              <span className="badge badge-owner">Most Books</span>
            </div>

            {metrics?.shelf_with_most_books ? (
              <div>
                <p style={{ fontSize: "20px", fontWeight: "800", color: "#38bdf8", marginBottom: "6px" }}>
                  {metrics.shelf_with_most_books.name}
                </p>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                  Contains <strong style={{ color: "#ffffff" }}>{metrics.shelf_with_most_books.book_count}</strong> book(s) in this curated collection.
                </p>
              </div>
            ) : (
              <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                No shelves created yet.
              </p>
            )}
          </div>

          {metrics?.shelf_with_most_books ? (
            <Link
              href={`/shelves/${metrics.shelf_with_most_books.id}`}
              className="btn btn-primary btn-sm"
              style={{ alignSelf: "flex-start" }}
            >
              Explore Shelf →
            </Link>
          ) : (
            <Link href="/shelves" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>
              + Create First Shelf
            </Link>
          )}
        </div>

        {/* Status Distribution */}
        <div
          className="design-card"
          style={{
            padding: "24px",
          }}
        >
          <h3 style={{ fontSize: "16px", marginBottom: "16px", color: "#ffffff", fontWeight: "700" }}>
            📖 Reading Status Distribution
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Want to read */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px", color: "var(--color-text-primary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                  Want to Read
                </span>
                <span style={{ fontWeight: 600, color: "#ffffff" }}>
                  {statusMap["WANT_TO_READ"] || 0} ({totalBooks ? Math.round(((statusMap["WANT_TO_READ"] || 0) / totalBooks) * 100) : 0}%)
                </span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["WANT_TO_READ"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "#f59e0b",
                    transition: "width var(--motion-normal)",
                  }}
                />
              </div>
            </div>

            {/* Currently Reading */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px", color: "var(--color-text-primary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8" }} />
                  Currently Reading
                </span>
                <span style={{ fontWeight: 600, color: "#ffffff" }}>
                  {statusMap["READING"] || 0} ({totalBooks ? Math.round(((statusMap["READING"] || 0) / totalBooks) * 100) : 0}%)
                </span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["READING"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "#38bdf8",
                    transition: "width var(--motion-normal)",
                  }}
                />
              </div>
            </div>

            {/* Finished */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px", color: "var(--color-text-primary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                  Finished
                </span>
                <span style={{ fontWeight: 600, color: "#ffffff" }}>
                  {statusMap["FINISHED"] || 0} ({totalBooks ? Math.round(((statusMap["FINISHED"] || 0) / totalBooks) * 100) : 0}%)
                </span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["FINISHED"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "#10b981",
                    transition: "width var(--motion-normal)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Recent Activity */}
      <div
        className="design-card"
        style={{
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="pulse-dot pulse-dot-green" />
            <h3 style={{ fontSize: "16px", color: "#ffffff", fontWeight: "700" }}>
              Live Activity Stream
            </h3>
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Real-time Domain Events</span>
          </div>
          <Link href="/activity" className="btn btn-ghost btn-xs" style={{ color: "var(--color-accent-primary)" }}>
            View Full Activity Log →
          </Link>
        </div>

        {!metrics?.recent_activity || metrics.recent_activity.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>No recent activity recorded.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {metrics.recent_activity.map((evt) => {
              const eventType = evt.event_type || evt.eventType || "EVENT";
              const timestamp = evt.created_at || evt.createdAt || new Date().toISOString();
              const p = evt.payload || {};
              const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              let icon = "⚡";
              let desc = "";
              switch (eventType) {
                case "BOOK_ADDED":
                  icon = "📖";
                  desc = `Added "${p.title || "Book"}"`;
                  break;
                case "BOOK_STATUS_CHANGED":
                  icon = "🔄";
                  desc = `Changed "${p.title || "Book"}" to ${p.new_status?.replace(/_/g, " ")}`;
                  break;
                case "BOOK_PROGRESS_UPDATED":
                  icon = "📊";
                  desc = `Updated progress on "${p.title || "Book"}" (${p.progress_percentage || 0}%)`;
                  break;
                case "BOOK_LENT":
                  icon = "🤝";
                  desc = `Lent "${p.book_title || "Book"}" to ${p.borrower_name || p.borrower_email || "user"}`;
                  break;
                case "BOOK_RETURNED":
                  icon = "↩️";
                  desc = `Returned "${p.book_title || "Book"}"`;
                  break;
                case "SHELF_SHARED":
                  icon = "👥";
                  desc = `Shared "${p.shelf_name || "Shelf"}" with ${p.collaborator_name || p.collaborator_email || "user"} (${p.role || "Viewer"})`;
                  break;
                case "COLLABORATOR_ROLE_CHANGED":
                  icon = "🛠️";
                  desc = `Changed role on "${p.shelf_name || "Shelf"}" to ${p.new_role}`;
                  break;
                case "COLLABORATOR_REMOVED":
                  icon = "🚪";
                  desc = `Removed collaborator from "${p.shelf_name || "Shelf"}"`;
                  break;
                case "BOOK_ADDED_TO_SHELF":
                  icon = "📌";
                  desc = `Added "${p.book_title}" to "${p.shelf_name}"`;
                  break;
                case "BOOK_REMOVED_FROM_SHELF":
                  icon = "📤";
                  desc = `Removed "${p.book_title}" from "${p.shelf_name}"`;
                  break;
                case "SHELF_CREATED":
                  icon = "📁";
                  desc = `Created shelf "${p.name}"`;
                  break;
                case "SHELF_DELETED":
                  icon = "🗑️";
                  desc = `Deleted shelf "${p.name}"`;
                  break;
                default:
                  desc = `${eventType.replace(/_/g, " ")}`;
              }

              return (
                <div
                  key={evt.id}
                  className="glass-panel"
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13px",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "14px" }}>{icon}</span>
                    <span style={{ color: "#ffffff" }}>{desc}</span>
                  </div>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "11px", whiteSpace: "nowrap" }}>
                    {timeStr} • {new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

