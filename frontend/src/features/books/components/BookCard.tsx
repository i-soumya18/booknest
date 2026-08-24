"use client";

import { useState } from "react";
import { Book } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { LendBookModal, returnBook } from "@/features/lending";

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
  const [showLendModal, setShowLendModal] = useState(false);
  const [lendError, setLendError] = useState<string | null>(null);

  const handleReturn = async () => {
    setLendError(null);
    try {
      await returnBook(book.id);
      if (onProgressUpdated) onProgressUpdated();
    } catch (err) {
      setLendError(err instanceof Error ? err.message : "Failed to return book.");
    }
  };

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
      className="design-card"
      style={{
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <div>
          <h3 style={{ fontSize: "var(--font-size-h3)", color: "var(--color-text-tertiary)", fontWeight: "600", marginBottom: "var(--space-1)" }}>
            {book.title}
          </h3>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-2xl)" }}>by {book.author}</p>
        </div>
        <span
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: 700,
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-full)",
            background: `${getStatusColor(book.status)}18`,
            color: getStatusColor(book.status),
            border: `1px solid ${getStatusColor(book.status)}50`,
            letterSpacing: "0.02em",
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
            fontSize: "var(--font-size-2xl)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          <span>Progress</span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ color: "var(--color-text-tertiary)", fontWeight: 500 }}>
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
                  color: "var(--color-accent-primary)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-2xl)",
                  padding: "0 var(--space-1)",
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
            background: "var(--color-surface-muted)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
            marginBottom: "var(--space-2)",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: getStatusColor(book.status),
              transition: "width var(--motion-normal)",
            }}
          />
        </div>

        {/* Inline Reading Progress Editor Form */}
        {isEditingProgress && (
          <form
            onSubmit={handleUpdateProgress}
            style={{
              marginTop: "var(--space-3)",
              padding: "var(--space-3)",
              background: "var(--color-surface-base)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <label style={{ fontSize: "var(--font-size-xl)", color: "var(--color-text-secondary)" }}>Page:</label>
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
                  padding: "var(--space-1) var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-tertiary)",
                  fontSize: "var(--font-size-2xl)",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  fontSize: "var(--font-size-xl)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-accent-primary)",
                  color: "#000000",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
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
                  padding: "var(--space-1) var(--space-3)",
                  fontSize: "var(--font-size-xl)",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border-default)",
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
                  color: "var(--color-error)",
                  fontSize: "var(--font-size-lg)",
                  marginTop: "var(--space-2)",
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
        <div style={{ fontSize: "var(--font-size-3xl)", color: "var(--color-warning)" }}>
          {"★".repeat(book.rating)}
          {"☆".repeat(5 - book.rating)}
        </div>
      )}

      {book.notes && (
        <p
          style={{
            fontSize: "var(--font-size-xl)",
            color: "var(--color-text-secondary)",
            fontStyle: "italic",
            lineHeight: 1.4,
          }}
        >
          &quot;{book.notes}&quot;
        </p>
      )}

      {lendError && (
        <div
          style={{
            fontSize: "var(--font-size-lg)",
            color: "var(--color-error)",
            marginTop: "var(--space-1)",
          }}
        >
          {lendError}
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-2)",
          marginTop: "var(--space-2)",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setShowLendModal(true)}
          style={{
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-2xl)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-accent-bg)",
            color: "var(--color-accent-primary)",
            border: "1px solid var(--color-border-muted)",
            cursor: "pointer",
            fontWeight: 600,
            transition: "all var(--motion-fast)",
          }}
        >
          🤝 Lend
        </button>
        <button
          onClick={handleReturn}
          style={{
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-2xl)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-muted)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-default)",
            cursor: "pointer",
            transition: "all var(--motion-fast)",
          }}
          title="Mark returned if lent"
        >
          ↩️ Return
        </button>
        <button
          onClick={() => onEdit(book)}
          style={{
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-2xl)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-muted)",
            color: "var(--color-text-tertiary)",
            border: "1px solid var(--color-border-default)",
            cursor: "pointer",
            transition: "all var(--motion-fast)",
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(book.id)}
          style={{
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-2xl)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-error-bg)",
            color: "var(--color-error)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            cursor: "pointer",
            transition: "all var(--motion-fast)",
          }}
        >
          Delete
        </button>
      </div>

      {showLendModal && (
        <LendBookModal
          book={book}
          onClose={() => setShowLendModal(false)}
          onSuccess={() => {
            if (onProgressUpdated) onProgressUpdated();
          }}
        />
      )}
    </div>
  );
}
