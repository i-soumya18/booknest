"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardMetrics, getDashboardMetrics } from "../api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/features/auth";


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
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
        Initializing authentication...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          maxWidth: "650px",
          margin: "3rem auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          padding: "2.5rem",
          textAlign: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📚</div>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
          Welcome to BookNest
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          Production-minded reading tracker featuring custom shelf RBAC, real-time WebSockets, atomic page progress tracking, and lending concurrency controls.
        </p>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem" }}>
            QUICK DEMO SIGN-IN
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => handleQuickLogin("alice@example.com")}
              disabled={loggingIn}
              style={{
                padding: "0.75rem 1.5rem",
                background: "var(--accent-color)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              {loggingIn ? "Logging in..." : "👤 Sign in as Alice (Owner)"}
            </button>
            <button
              onClick={() => handleQuickLogin("bob@example.com")}
              disabled={loggingIn}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              {loggingIn ? "Logging in..." : "👤 Sign in as Bob (Borrower)"}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--error-color)", fontSize: "0.85rem", marginTop: "1rem" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  if (loading && !metrics) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
        Loading dashboard...
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div
        style={{
          background: "#ef444415",
          border: "1px solid #ef444440",
          color: "var(--error-color)",
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          margin: "2rem 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{error}</span>
        <button
          onClick={fetchMetrics}
          style={{
            padding: "0.4rem 0.8rem",
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
    );
  }


  const statusMap = metrics?.books_by_status || {};
  const totalBooks = Object.values(statusMap).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          📊 Dashboard Overview
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
          Real-time reading metrics and activity summary computed live from PostgreSQL.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2.5rem",
        }}
      >
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            📚 Total Books
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            {totalBooks}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            🎯 Finished This Year
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
            {metrics?.books_finished_this_year || 0}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            ⭐ Average Rating
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
            {metrics?.average_rating !== null && metrics?.average_rating !== undefined
              ? `${metrics.average_rating} / 5`
              : "N/A"}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            🤝 Currently Lent Out
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#6366f1" }}>
            {metrics?.books_currently_lent_out || 0}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            📂 Shared Shelves
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ec4899" }}>
            {metrics?.shelves_shared_with_user || 0}
          </div>
        </div>
      </div>

      {/* Top Shelf & Reading Breakdown Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2.5rem",
        }}
      >
        {/* Top Shelf Highlight */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
            🏆 Top Shelf
          </h3>
          {metrics?.shelf_with_most_books ? (
            <div>
              <p style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--accent-color)", marginBottom: "0.25rem" }}>
                {metrics.shelf_with_most_books.name}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Contains <strong>{metrics.shelf_with_most_books.book_count}</strong> book(s)
              </p>
              <Link
                href={`/shelves/${metrics.shelf_with_most_books.id}`}
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  background: "var(--accent-color)",
                  color: "#fff",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  textDecoration: "none",
                }}
              >
                View Shelf
              </Link>
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              No shelves created yet.
            </p>
          )}
        </div>

        {/* Status Distribution */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
            📖 Reading Status Breakdown
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                <span>Want to Read</span>
                <span>{statusMap["WANT_TO_READ"] || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["WANT_TO_READ"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "#3b82f6",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                <span>Currently Reading</span>
                <span>{statusMap["READING"] || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["READING"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "#f59e0b",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                <span>Finished</span>
                <span>{statusMap["FINISHED"] || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalBooks ? ((statusMap["FINISHED"] || 0) / totalBooks) * 100 : 0}%`,
                    background: "#10b981",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Recent Activity */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>
            ⚡ Live Activity Stream
          </h3>
          <Link href="/activity" style={{ fontSize: "0.875rem", color: "var(--accent-color)", textDecoration: "none" }}>
            View Full Activity Log →
          </Link>
        </div>

        {!metrics?.recent_activity || metrics.recent_activity.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No recent activity recorded.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {metrics.recent_activity.map((evt) => {
              const eventType = evt.event_type || evt.eventType || "EVENT";
              const timestamp = evt.created_at || evt.createdAt || new Date().toISOString();
              return (
                <div
                  key={evt.id}
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    paddingBottom: "0.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                  }}
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    {eventType.replace(/_/g, " ")} — {evt.payload?.title || evt.payload?.name || evt.payload?.book_title || "item"}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
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
