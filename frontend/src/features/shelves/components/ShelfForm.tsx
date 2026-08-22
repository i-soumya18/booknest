"use client";

import { useState, FormEvent } from "react";
import { Shelf } from "@/types";

export interface ShelfFormData {
  name: string;
  description?: string | null;
}

interface ShelfFormProps {
  initialData?: Shelf | null;
  onSubmit: (data: ShelfFormData) => Promise<void>;
  onCancel: () => void;
}

export function ShelfForm({ initialData, onSubmit, onCancel }: ShelfFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Shelf name is required.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shelf.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "450px",
          padding: "1.5rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          {initialData ? "Edit Shelf" : "Create New Shelf"}
        </h2>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "4px",
              background: "#ef444420",
              border: "1px solid #ef444440",
              color: "var(--error-color)",
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Shelf Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sci-Fi, Favorites, To Buy"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                background: "var(--accent-color)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {loading ? "Saving..." : initialData ? "Update Shelf" : "Create Shelf"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
