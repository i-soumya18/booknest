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
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="design-card"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-h2)", marginBottom: "var(--space-6)", color: "var(--color-text-tertiary)", fontWeight: "700", letterSpacing: "-0.02em" }}>
          {initialData ? "✏️ Edit Shelf" : "📁 Create New Shelf"}
        </h2>

        {error && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-error-bg)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "var(--color-error)",
              fontSize: "var(--font-size-2xl)",
              marginBottom: "var(--space-5)",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Shelf Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sci-Fi, System Design, To Buy"
              style={{
                width: "100%",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
                background: "var(--color-surface-base)",
                color: "var(--color-text-tertiary)",
                fontSize: "var(--font-size-3xl)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this collection..."
              style={{
                width: "100%",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
                background: "var(--color-surface-base)",
                color: "var(--color-text-tertiary)",
                fontSize: "var(--font-size-3xl)",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "var(--space-3) var(--space-6)",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                cursor: "pointer",
                fontSize: "var(--font-size-2xl)",
                transition: "all var(--motion-fast)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "var(--space-3) var(--space-6)",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, #00c2ff 0%, #0070f3 100%)",
                color: "#000000",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "var(--font-size-2xl)",
                boxShadow: "var(--shadow-2)",
                transition: "all var(--motion-fast)",
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
