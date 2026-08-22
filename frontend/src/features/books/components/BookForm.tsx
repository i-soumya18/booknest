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
          maxWidth: "500px",
          padding: "1.5rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          {initialData ? "Edit Book" : "Add New Book"}
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
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Author</label>
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="WANT_TO_READ">Want to Read</option>
                <option value="READING">Reading</option>
                <option value="FINISHED">Finished</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Rating (1-5)</label>
              <select
                value={rating || ""}
                onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">No Rating</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
                <option value="4">4 Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Total Pages</label>
              <input
                type="number"
                min="1"
                required
                value={totalPages}
                onChange={(e) => setTotalPages(Number(e.target.value))}
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
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Current Page</label>
              <input
                type="number"
                min="0"
                required
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
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
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {loading ? "Saving..." : initialData ? "Update Book" : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
