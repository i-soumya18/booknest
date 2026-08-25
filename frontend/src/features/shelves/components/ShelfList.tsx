"use client";

import { useEffect, useState, useCallback } from "react";
import { Shelf } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { ShelfCard } from "./ShelfCard";
import { ShelfForm, ShelfFormData } from "./ShelfForm";
import { Skeleton, SkeletonCard, ErrorBanner } from "@/components/ui";

type FilterTab = "all" | "shared";

export function ShelfList() {
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
    if (editingShelf) {
      const updated = await fetchApi<Shelf>(`/api/v1/shelves/${editingShelf.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setShelves((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await fetchApi<Shelf>("/api/v1/shelves", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setShelves((prev) => [created, ...prev]);
    }
    setIsFormOpen(false);
    setEditingShelf(null);
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
    <div style={{ padding: "var(--space-6) 0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-8)",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div className="section-header" style={{ marginBottom: 0 }}>
          <h2>My Shelves</h2>
          <p>Organize your books into custom collections and shared collaborative shelves.</p>
        </div>
        <button
          onClick={() => {
            setEditingShelf(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary"
        >
          + New Shelf
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-8)",
          borderBottom: "1px solid var(--color-border-default)",
          paddingBottom: "var(--space-3)",
        }}
      >
        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "var(--space-2) var(--space-5)",
            border: "none",
            background: activeTab === "all" ? "var(--color-accent-primary)" : "transparent",
            color: activeTab === "all" ? "#000000" : "var(--color-text-secondary)",
            borderRadius: "var(--radius-md)",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "var(--font-size-2xl)",
            transition: "all var(--motion-fast)",
          }}
        >
          📁 All Shelves
        </button>

        <button
          onClick={() => setActiveTab("shared")}
          style={{
            padding: "var(--space-2) var(--space-5)",
            border: "none",
            background: activeTab === "shared" ? "var(--color-accent-primary)" : "transparent",
            color: activeTab === "shared" ? "#000000" : "var(--color-text-secondary)",
            borderRadius: "var(--radius-md)",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "var(--font-size-2xl)",
            transition: "all var(--motion-fast)",
          }}
        >
          🤝 Shared With Me
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
