"use client";

import { useEffect, useState, useCallback } from "react";
import { Shelf } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { ShelfCard } from "./ShelfCard";
import { ShelfForm, ShelfFormData } from "./ShelfForm";

export function ShelfList() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);

  const loadShelves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<Shelf[]>("/api/v1/shelves");
      setShelves(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shelves.");
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!confirm("Are you sure you want to delete this shelf? Books on this shelf will NOT be deleted.")) return;
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}`, { method: "DELETE" });
      setShelves((prev) => prev.filter((s) => s.id !== shelfId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete shelf.");
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
            Organize your books into custom collections.
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

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
          Loading your shelves...
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
            No custom shelves created yet.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Create shelves to categorize your reading library (e.g. Sci-Fi, Favorites, To Buy).
          </p>
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
