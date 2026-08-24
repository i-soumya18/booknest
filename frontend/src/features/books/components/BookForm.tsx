"use client";

import { useState, FormEvent } from "react";
import { Book, BookStatus } from "@/types";

export interface BookFormData {
  title: string;
  author: string;
  status: BookStatus;
  totalPages: number;
  currentPage: number;
  rating?: number | null;
  notes?: string | null;
}

interface BookFormProps {
  initialData?: Book | null;
  onSubmit: (data: BookFormData) => Promise<void>;
  onCancel: () => void;
}

export function BookForm({ initialData, onSubmit, onCancel }: BookFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [author, setAuthor] = useState(initialData?.author || "");
  const [status, setStatus] = useState<BookStatus>(initialData?.status || "WANT_TO_READ");
  const [totalPages, setTotalPages] = useState<number>(initialData?.totalPages || 100);
  const [currentPage, setCurrentPage] = useState<number>(initialData?.currentPage || 0);
  const [rating, setRating] = useState<number | undefined>(initialData?.rating || undefined);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !author.trim()) {
      setError("Title and Author are required.");
      return;
    }
    if (currentPage > totalPages) {
      setError("Current page cannot exceed total pages.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        status,
        totalPages: Number(totalPages),
        currentPage: Number(currentPage),
        rating: rating ? Number(rating) : null,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save book.");
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
          maxWidth: "520px",
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-h2)", marginBottom: "var(--space-6)", color: "var(--color-text-tertiary)", fontWeight: "700", letterSpacing: "-0.02em" }}>
          {initialData ? "✏️ Edit Book" : "✨ Add New Book"}
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
            <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Designing Data-Intensive Applications"
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
            <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Author *</label>
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Martin Kleppmann"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
                style={{
                  width: "100%",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-surface-base)",
                  color: "var(--color-text-tertiary)",
                  fontSize: "var(--font-size-2xl)",
                  cursor: "pointer",
                }}
              >
                <option value="WANT_TO_READ">Want to Read</option>
                <option value="READING">Reading</option>
                <option value="FINISHED">Finished</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Rating (1–5)</label>
              <select
                value={rating || ""}
                onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  width: "100%",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-surface-base)",
                  color: "var(--color-text-tertiary)",
                  fontSize: "var(--font-size-2xl)",
                  cursor: "pointer",
                }}
              >
                <option value="">No rating</option>
                <option value="1">⭐ 1 star</option>
                <option value="2">⭐⭐ 2 stars</option>
                <option value="3">⭐⭐⭐ 3 stars</option>
                <option value="4">⭐⭐⭐⭐ 4 stars</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 stars</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Total Pages *</label>
              <input
                type="number"
                min="1"
                required
                value={totalPages}
                onChange={(e) => setTotalPages(Number(e.target.value))}
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
              <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Current Page</label>
              <input
                type="number"
                min="0"
                max={totalPages}
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
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
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)", fontWeight: 500 }}>Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional personal notes, takeaways, or quotes..."
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
              {loading ? "Saving..." : initialData ? "Update Book" : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
