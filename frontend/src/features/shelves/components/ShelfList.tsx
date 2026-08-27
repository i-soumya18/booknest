"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Shelf } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { ShelfCard } from "./ShelfCard";
import { ShelfForm, ShelfFormData } from "./ShelfForm";
import { Skeleton, SkeletonCard, ErrorBanner, useToast } from "@/components/ui";

type FilterTab = "all" | "shared";

export function ShelfList() {
  const { success, error: toastError } = useToast();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);

  const loadShelves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === "shared" ? "/api/v1/shelves/shared-with-me" : "/api/v1/shelves";
      const data = await fetchApi<Shelf[]>(endpoint);
      setShelves(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shelves.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadShelves();
  }, [loadShelves]);

  const handleCreateOrUpdate = async (formData: ShelfFormData) => {
    try {
      if (editingShelf) {
        const updated = await fetchApi<Shelf>(`/api/v1/shelves/${editingShelf.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        setShelves((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        success(`Updated shelf "${formData.name}"`);
      } else {
        const created = await fetchApi<Shelf>("/api/v1/shelves", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setShelves((prev) => [created, ...prev]);
        success(`Created shelf "${formData.name}"`);
      }
      setIsFormOpen(false);
      setEditingShelf(null);
    } catch (err) {
      toastError("Save failed", err instanceof Error ? err.message : "Error saving shelf");
    }
  };

  const handleDelete = async (shelfId: string) => {
    setError(null);
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}`, { method: "DELETE" });
      setShelves((prev) => prev.filter((s) => s.id !== shelfId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete shelf.");
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div className="section-header" style={{ marginBottom: 0 }}>
          <h2>📁 Shelf Collections</h2>
          <p>Organize books into custom collections with fine-grained role-based access control (RBAC).</p>
        </div>
        <button
          onClick={() => {
            setEditingShelf(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary"
        >
          <span>+</span> New Shelf
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          borderBottom: "1px solid var(--color-border-default)",
          paddingBottom: "12px",
        }}
      >
        <button
          onClick={() => setActiveTab("all")}
          className="btn btn-xs"
          style={{
            background: activeTab === "all" ? "rgba(56, 189, 248, 0.18)" : "transparent",
            color: activeTab === "all" ? "#38bdf8" : "var(--color-text-secondary)",
            border: activeTab === "all" ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
            borderRadius: "var(--radius-full)",
            fontWeight: activeTab === "all" ? 700 : 500,
            padding: "6px 14px",
            fontSize: "13px",
          }}
        >
          📁 All Shelves {activeTab === "all" && `(${shelves.length})`}
        </button>

        <button
          onClick={() => setActiveTab("shared")}
          className="btn btn-xs"
          style={{
            background: activeTab === "shared" ? "rgba(56, 189, 248, 0.18)" : "transparent",
            color: activeTab === "shared" ? "#38bdf8" : "var(--color-text-secondary)",
            border: activeTab === "shared" ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
            borderRadius: "var(--radius-full)",
            fontWeight: activeTab === "shared" ? 700 : 500,
            padding: "6px 14px",
            fontSize: "13px",
          }}
        >
          👥 Shared With Me {activeTab === "shared" && `(${shelves.length})`}
        </button>
      </div>


      {/* Loading Skeleton State */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
          aria-busy="true"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card" style={{ minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <Skeleton className="skeleton-title" width="60%" style={{ marginBottom: "var(--space-3)" }} />
                <Skeleton className="skeleton-text" width="80%" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border-muted)", paddingTop: "var(--space-3)" }}>
                <Skeleton width="110px" height="18px" />
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <Skeleton width="48px" height="26px" borderRadius="var(--radius-sm)" />
                  <Skeleton width="48px" height="26px" borderRadius="var(--radius-sm)" />
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <ErrorBanner message={error} onRetry={loadShelves} />
      )}

      {/* Empty State */}
      {!loading && !error && shelves.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "var(--color-surface-raised)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--color-border-default)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-h3)", color: "var(--color-text-tertiary)", marginBottom: "0.5rem", fontWeight: 600 }}>
            {activeTab === "shared" ? "No shelves shared with you yet." : "No custom shelves created yet."}
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)", marginBottom: "1.5rem" }}>
            {activeTab === "shared"
              ? "When someone shares a shelf with you, it will appear here in real-time."
              : "Create shelves to categorize your reading library (e.g. Sci-Fi, Favorites, To Buy)."}
          </p>
          {activeTab === "all" && (
            <button
              onClick={() => {
                setEditingShelf(null);
                setIsFormOpen(true);
              }}
              className="btn btn-primary"
            >
              + Create First Shelf
            </button>
          )}
        </div>
      )}

      {/* Success State */}
      {!loading && !error && shelves.length > 0 && (
        <>
          {activeTab === "shared" && (
            <div
              className="design-card"
              style={{
                marginBottom: "var(--space-8)",
                overflowX: "auto",
                padding: "var(--space-2)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "var(--font-size-2xl)",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--color-border-default)",
                      color: "var(--color-text-secondary)",
                      fontSize: "var(--font-size-xl)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "var(--space-4) var(--space-6)" }}>Shelf</th>
                    <th style={{ padding: "var(--space-4) var(--space-6)" }}>Role</th>
                    <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shelves.map((shelf) => {
                    const role = shelf.userRole || (shelf as any).user_role || "VIEWER";
                    const isEditor = role === "EDITOR";
                    return (
                      <tr
                        key={shelf.id}
                        style={{
                          borderBottom: "1px solid var(--color-border-muted)",
                          transition: "background var(--motion-fast)",
                        }}
                      >
                        <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 600, color: "var(--color-text-tertiary)" }}>
                          📁 {shelf.name}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)" }}>
                          <span
                            style={{
                              fontSize: "var(--font-size-sm)",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "var(--radius-full)",
                              background: isEditor ? "rgba(0, 194, 255, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: isEditor ? "var(--color-accent-primary)" : "var(--color-success)",
                              border: `1px solid ${isEditor ? "rgba(0, 194, 255, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            {role}
                          </span>
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", textAlign: "right" }}>
                          <Link
                            href={`/shelves/${shelf.id}`}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--color-accent-primary)" }}
                          >
                            View Books →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {shelves.map((shelf) => (
              <ShelfCard
                key={shelf.id}
                shelf={shelf}
                onEdit={(s) => {
                  setEditingShelf(s);
                  setIsFormOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <ShelfForm
          initialData={editingShelf}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingShelf(null);
          }}
        />
      )}
    </div>
  );
}
