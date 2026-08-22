"use client";

import { useEffect, useState, useCallback } from "react";
import { Shelf } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { ShelfCard } from "./ShelfCard";
import { ShelfForm, ShelfFormData } from "./ShelfForm";

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
    <div style={{ padding: "1.5rem 0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", color: "var(--text-primary)" }}>My Shelves</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Organize your books into custom collections and shared team shelves.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingShelf(null);
            setIsFormOpen(true);
          }}
          style={{
            padding: "0.6rem 1.2rem",
            background: "var(--accent-color)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New Shelf
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "0.5rem 1rem",
            border: "none",
            background: activeTab === "all" ? "var(--accent-color)" : "transparent",
            color: activeTab === "all" ? "#fff" : "var(--text-secondary)",
            borderRadius: "4px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          All Shelves
        </button>

        <button
          onClick={() => setActiveTab("shared")}
          style={{
            padding: "0.5rem 1rem",
            border: "none",
            background: activeTab === "shared" ? "var(--accent-color)" : "transparent",
            color: activeTab === "shared" ? "#fff" : "var(--text-secondary)",
            borderRadius: "4px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Shared With Me
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
          Loading shelves...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            background: "#ef444420",
            border: "1px solid #ef444440",
            color: "var(--error-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={loadShelves}
            style={{
              padding: "0.4rem 0.8rem",
              background: "var(--error-color)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && shelves.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "var(--bg-surface)",
            borderRadius: "8px",
            border: "1px dashed var(--border-color)",
          }}
        >
          <p style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            {activeTab === "shared" ? "No shelves shared with you yet." : "No custom shelves created yet."}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {activeTab === "shared"
              ? "When someone shares a shelf with you, it will appear here."
              : "Create shelves to categorize your reading library (e.g. Sci-Fi, Favorites, To Buy)."}
          </p>
          {activeTab === "all" && (
            <button
              onClick={() => {
                setEditingShelf(null);
                setIsFormOpen(true);
              }}
              style={{
                padding: "0.6rem 1.2rem",
                background: "var(--accent-color)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
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
