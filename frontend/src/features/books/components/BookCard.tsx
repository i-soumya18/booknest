"use client";

import { useState } from "react";
import { Book } from "@/types";
import { fetchApi } from "@/lib/api/client";

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onProgressUpdated?: () => void;
}

export function BookCard({ book, onEdit, onDelete, onProgressUpdated }: BookCardProps) {
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [pageInput, setPageInput] = useState<number>(book.currentPage);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progressPercent = Math.min(
    100,
    Math.round((book.currentPage / (book.totalPages || 1)) * 100)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "FINISHED":
        return "#10b981"; // green
      case "READING":
        return "#3b82f6"; // blue
      case "WANT_TO_READ":
      default:
        return "#f59e0b"; // amber
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgressError(null);

    if (pageInput < 0) {
      setProgressError("Page cannot be negative.");
      return;
    }
    if (pageInput > book.totalPages) {
      setProgressError("Page cannot exceed total pages.");
      return;
    }

    setLoading(true);
    try {
      await fetchApi(`/api/v1/books/${book.id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ current_page: Number(pageInput) }),
      });
      setIsEditingProgress(false);
      if (onProgressUpdated) onProgressUpdated();
    } catch (err) {
      setProgressError(err instanceof Error ? err.message : "Failed to update progress.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            {book.title}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>by {book.author}</p>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            padding: "0.25rem 0.5rem",
            borderRadius: "4px",
            background: `${getStatusColor(book.status)}20`,
            color: getStatusColor(book.status),
            border: `1px solid ${getStatusColor(book.status)}40`,
          }}
        >
          {book.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Progress Bar & Quick Updater */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            marginBottom: "0.25rem",
          }}
        >
          <span>Progress</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>
              {book.currentPage} / {book.totalPages} pages ({progressPercent}%)
            </span>
            {!isEditingProgress && (
              <button
                onClick={() => {
                  setPageInput(book.currentPage);
                  setProgressError(null);
                  setIsEditingProgress(true);
                }}
                title="Update Page Progress"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-color)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  padding: "0 0.2rem",
                }}
              >
                ✏️
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: "6px",
            background: "var(--bg-card)",
            borderRadius: "3px",
            overflow: "hidden",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: getStatusColor(book.status),
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Inline Reading Progress Editor Form */}
        {isEditingProgress && (
          <form
            onSubmit={handleUpdateProgress}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem",
              background: "var(--bg-primary)",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Page:</label>
              <input
                type="number"
                min="0"
                max={book.totalPages}
                value={pageInput}
                onChange={(e) => {
                  setPageInput(Number(e.target.value));
                  setProgressError(null);
                }}
                style={{
                  width: "80px",
                  padding: "0.25rem 0.4rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.25rem 0.6rem",
                  fontSize: "0.8rem",
                  borderRadius: "4px",
                  background: "var(--accent-color)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProgress(false);
                  setProgressError(null);
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.8rem",
                  borderRadius: "4px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>

            {/* Inline Error Message */}
            {progressError && (
              <div
                style={{
                  color: "var(--error-color)",
                  fontSize: "0.8rem",
                  marginTop: "0.4rem",
                  fontWeight: 500,
                }}
              >
                {progressError}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Rating & Notes */}
      {book.rating && (
        <div style={{ fontSize: "0.9rem", color: "#f59e0b" }}>
          {"★".repeat(book.rating)}
          {"☆".repeat(5 - book.rating)}
        </div>
      )}

      {book.notes && (
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            fontStyle: "italic",
            lineHeight: 1.4,
          }}
        >
          &quot;{book.notes}&quot;
        </p>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
          marginTop: "0.5rem",
        }}
      >
        <button
          onClick={() => onEdit(book)}
          style={{
            padding: "0.4rem 0.8rem",
            fontSize: "0.85rem",
            borderRadius: "4px",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(book.id)}
          style={{
            padding: "0.4rem 0.8rem",
            fontSize: "0.85rem",
            borderRadius: "4px",
            background: "#ef444420",
            color: "var(--error-color)",
            border: "1px solid #ef444440",
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
