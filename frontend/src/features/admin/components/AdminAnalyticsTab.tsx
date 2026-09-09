"use client";

import { useEffect, useState } from "react";
import { AdminAnalytics, getAdminAnalytics } from "@/features/admin";
import { Spinner, useToast } from "@/components/ui";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function AdminAnalyticsTab() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: toastError } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAnalytics();
      setAnalytics(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load admin analytics";
      setError(msg);
      toastError("Failed to load analytics", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !analytics) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
        <Spinner />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="design-card" style={{ padding: "2rem", textAlign: "center", borderColor: "rgba(239, 68, 68, 0.4)" }}>
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>⚠️ {error}</p>
        <button onClick={loadData} className="btn btn-secondary btn-sm">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Registered Users",
      value: analytics?.total_users ?? 0,
      icon: "👥",
      description: "Accounts in BookNest database",
      color: "#38bdf8",
    },
    {
      title: "Total Library Books",
      value: analytics?.total_books ?? 0,
      icon: "📚",
      description: "Books tracked across all users",
      color: "#818cf8",
    },
    {
      title: "Books with Files",
      value: analytics?.total_books_with_file ?? 0,
      icon: "📖",
      description: "Uploaded PDF & EPUB documents",
      color: "#34d399",
    },
    {
      title: "Total Storage Consumed",
      value: formatBytes(analytics?.total_storage_bytes ?? 0),
      icon: "💾",
      description: "Files & attachments on storage volume",
      color: "#f472b6",
    },
    {
      title: "Active Readers (7 Days)",
      value: analytics?.active_readers_7d ?? 0,
      icon: "⚡",
      description: "Users with reading activity in last 7d",
      color: "#fbbf24",
    },
    {
      title: "Active Book Lendings",
      value: analytics?.active_lendings ?? 0,
      icon: "🤝",
      description: "Currently borrowed books outstanding",
      color: "#a78bfa",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            System Analytics & Metrics
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
            Real-time platform telemetry across storage, users, and digital books.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          {loading ? <Spinner /> : "🔄"} Refresh Metrics
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        {statCards.map((c, idx) => (
          <div
            key={idx}
            className="design-card"
            style={{
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderLeft: `4px solid ${c.color}`,
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                {c.title}
              </span>
              <span style={{ fontSize: "1.5rem" }}>{c.icon}</span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              {c.value}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              {c.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
