"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardMetrics, getDashboardMetrics } from "../api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/features/auth";
import { Spinner, Skeleton, SkeletonCard, ErrorBanner } from "@/components/ui";

export function DashboardView() {
  const { user, loading: authLoading, login } = useAuth();
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
      (_event: any) => {
        fetchMetrics();
      },
      [fetchMetrics]
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "var(--space-4)" }}>
        <Spinner size="lg" />
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)" }}>
          Initializing authentication...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="design-card"
        style={{
          maxWidth: "650px",
          margin: "3rem auto",
          padding: "var(--space-8)",
          textAlign: "center",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div style={{ fontSize: "3.5rem", marginBottom: "var(--space-4)", filter: "drop-shadow(0 0 12px rgba(0, 194, 255, 0.4))" }}>📚</div>
        <h2 style={{ fontSize: "var(--font-size-h1)", marginBottom: "var(--space-3)", color: "var(--color-text-tertiary)", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Welcome to BookNest
        </h2>
        <p style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-4xl)", lineHeight: 1.6, marginBottom: "var(--space-8)" }}>
          Production-minded reading tracker featuring custom shelf RBAC, real-time WebSockets, atomic page progress tracking, and lending concurrency controls.
        </p>

        <div style={{ marginBottom: "var(--space-6)" }}>
          <p style={{ fontSize: "var(--font-size-2xl)", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "var(--space-4)", letterSpacing: "0.05em" }}>
            QUICK DEMO SIGN-IN
          </p>
          <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => handleQuickLogin("alice@example.com")}
              disabled={loggingIn}
              className="btn btn-primary"
            >
              {loggingIn ? <Spinner /> : "👤"} Sign in as Alice (Owner)
            </button>
            <button
              onClick={() => handleQuickLogin("bob@example.com")}
              disabled={loggingIn}
              className="btn btn-secondary"
            >
              {loggingIn ? <Spinner /> : "👤"} Sign in as Bob (Borrower)
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <ErrorBanner message={error} />
          </div>
        )}
      </div>
    );
  }

  // Dashboard Loading State with Shimmer Skeletons
  if (loading && !metrics) {
    return (
      <div style={{ padding: "var(--space-6) 0" }} aria-label="Loading dashboard" aria-busy="true">
        <div className="section-header">
          <Skeleton className="skeleton-title" width="280px" style={{ marginBottom: "var(--space-2)" }} />
          <Skeleton className="skeleton-text" width="450px" />
        </div>

        {/* 5-Card Stats Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-6)",
            marginBottom: "var(--space-10)",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card">
              <Skeleton className="skeleton-text" width="60%" style={{ marginBottom: "var(--space-3)" }} />
              <Skeleton width="45%" height="36px" />
            </SkeletonCard>
          ))}
        </div>

        {/* 2-Column Row Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "var(--space-8)",
            marginBottom: "var(--space-10)",
          }}
        >
          <SkeletonCard>
            <Skeleton className="skeleton-title" width="40%" style={{ marginBottom: "var(--space-4)" }} />
            <Skeleton className="skeleton-title" width="70%" style={{ marginBottom: "var(--space-2)" }} />
            <Skeleton className="skeleton-text" width="50%" style={{ marginBottom: "var(--space-4)" }} />
            <Skeleton width="120px" height="32px" borderRadius="var(--radius-md)" />
          </SkeletonCard>
          <SkeletonCard>
            <Skeleton className="skeleton-title" width="55%" style={{ marginBottom: "var(--space-5)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <Skeleton height="16px" />
              <Skeleton height="16px" />
              <Skeleton height="16px" />
            </div>
          </SkeletonCard>
        </div>

        {/* Activity Stream Skeleton */}
        <SkeletonCard>
          <Skeleton className="skeleton-title" width="30%" style={{ marginBottom: "var(--space-6)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "var(--space-3)", borderBottom: "1px solid var(--color-border-muted)" }}>
                <Skeleton className="skeleton-text" width="60%" />
                <Skeleton className="skeleton-text" width="70px" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    );
  }

  // Dashboard Error State
  if (error && !metrics) {
    return (
      <div style={{ padding: "var(--space-6) 0" }}>
        <ErrorBanner message={error} onRetry={fetchMetrics} />
      </div>
    );
  }

  const statusMap = metrics?.books_by_status || {};
  const totalBooks = Object.values(statusMap).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: "var(--space-6) 0" }}>
      <div className="section-header">
        <h1>📊 Dashboard Overview</h1>
        <p>Real-time reading metrics and activity summary computed live from PostgreSQL.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-6)",
          marginBottom: "var(--space-10)",
        }}
      >
        <div
          className="design-card"
          style={{
            padding: "var(--space-6)",
            background: "linear-gradient(180deg, var(--color-surface-raised) 0%, rgba(14, 45, 73, 0.6) 100%)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", fontWeight: 500 }}>
            📚 Total Books
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "var(--color-text-tertiary)", letterSpacing: "-0.03em" }}>
            {totalBooks}
          </div>
        </div>

        <div
          className="design-card"
          style={{
            padding: "var(--space-6)",
            background: "linear-gradient(180deg, var(--color-surface-raised) 0%, rgba(14, 45, 73, 0.6) 100%)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", fontWeight: 500 }}>
            🎯 Finished This Year
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "var(--color-success)", letterSpacing: "-0.03em" }}>
            {metrics?.books_finished_this_year || 0}
          </div>
        </div>

        <div
          className="design-card"
          style={{
            padding: "var(--space-6)",
            background: "linear-gradient(180deg, var(--color-surface-raised) 0%, rgba(14, 45, 73, 0.6) 100%)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", fontWeight: 500 }}>
            ⭐ Average Rating
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "var(--color-warning)", letterSpacing: "-0.03em" }}>
            {metrics?.average_rating !== null && metrics?.average_rating !== undefined
              ? `${metrics.average_rating} / 5`
              : "N/A"}
          </div>
        </div>

        <div
          className="design-card"
          style={{
            padding: "var(--space-6)",
            background: "linear-gradient(180deg, var(--color-surface-raised) 0%, rgba(14, 45, 73, 0.6) 100%)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", fontWeight: 500 }}>
            🤝 Currently Lent Out
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "var(--color-accent-primary)", letterSpacing: "-0.03em" }}>
            {metrics?.books_currently_lent_out || 0}
          </div>
        </div>

        <div
          className="design-card"
          style={{
            padding: "var(--space-6)",
            background: "linear-gradient(180deg, var(--color-surface-raised) 0%, rgba(14, 45, 73, 0.6) 100%)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", fontWeight: 500 }}>
            📂 Shared Shelves
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#38d1ff", letterSpacing: "-0.03em" }}>
            {metrics?.shelves_shared_with_user || 0}
          </div>
        </div>
      </div>

      {/* Top Shelf & Reading Breakdown Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-8)",
          marginBottom: "var(--space-10)",
        }}
      >
        {/* Top Shelf Highlight */}
        <div
          className="design-card"
          style={{
            padding: "var(--space-8)",
          }}
        >
          <h3 style={{ fontSize: "var(--font-size-h3)", marginBottom: "var(--space-5)", color: "var(--color-text-tertiary)", fontWeight: "600" }}>
            🏆 Top Shelf
          </h3>
          {metrics?.shelf_with_most_books ? (
            <div>
              <p style={{ fontSize: "var(--font-size-h2)", fontWeight: "700", color: "var(--color-accent-primary)", marginBottom: "var(--space-2)" }}>
                {metrics.shelf_with_most_books.name}
              </p>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)", marginBottom: "var(--space-6)" }}>
                Contains <strong style={{ color: "var(--color-text-tertiary)" }}>{metrics.shelf_with_most_books.book_count}</strong> book(s)
              </p>
              <Link
                href={`/shelves/${metrics.shelf_with_most_books.id}`}
                className="btn btn-primary"
              >
                View Shelf →
              </Link>
            </div>
          ) : (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)" }}>
              No shelves created yet.
            </p>
          )}
        </div>

        {/* Status Distribution */}
        <div
          className="design-card"
          style={{
            padding: "var(--space-8)",
          }}
        >
          <h3 style={{ fontSize: "var(--font-size-h3)", marginBottom: "var(--space-5)", color: "var(--color-text-tertiary)", fontWeight: "600" }}>
            📖 Reading Status Breakdown
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)" }}>
                <span>Want to Read</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-tertiary)" }}>{statusMap["WANT_TO_READ"] || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--color-surface-muted)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["WANT_TO_READ"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "var(--color-accent-primary)",
                    transition: "width var(--motion-normal)",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)" }}>
                <span>Currently Reading</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-tertiary)" }}>{statusMap["READING"] || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--color-surface-muted)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["READING"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "var(--color-warning)",
                    transition: "width var(--motion-normal)",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)" }}>
                <span>Finished</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-tertiary)" }}>{statusMap["FINISHED"] || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--color-surface-muted)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["FINISHED"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "var(--color-success)",
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
          padding: "var(--space-8)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
          <h3 style={{ fontSize: "var(--font-size-h3)", color: "var(--color-text-tertiary)", fontWeight: "600" }}>
            ⚡ Live Activity Stream
          </h3>
          <Link href="/activity" style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-accent-primary)", fontWeight: 600, textDecoration: "none" }}>
            View Full Activity Log →
          </Link>
        </div>

        {!metrics?.recent_activity || metrics.recent_activity.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)" }}>No recent activity recorded.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {metrics.recent_activity.map((evt) => {
              const eventType = evt.event_type || evt.eventType || "EVENT";
              const timestamp = evt.created_at || evt.createdAt || new Date().toISOString();
              return (
                <div
                  key={evt.id}
                  style={{
                    borderBottom: "1px solid var(--color-border-muted)",
                    paddingBottom: "var(--space-4)",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "var(--font-size-2xl)",
                  }}
                >
                  <span style={{ color: "var(--color-text-tertiary)" }}>
                    <span style={{ color: "var(--color-accent-primary)", fontWeight: 600 }}>{eventType.replace(/_/g, " ")}</span> — {evt.payload?.title || evt.payload?.name || evt.payload?.book_title || "item"}
                  </span>
                  <span style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-md)" }}>
                    {new Date(timestamp).toLocaleTimeString()}
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
