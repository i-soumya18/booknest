"use client";

import { useState } from "react";
import { Book } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { LendBookModal, returnBook } from "@/features/lending";
import { Spinner } from "@/components/ui";

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onProgressUpdated?: () => void;
}

export function BookCard({ book, onEdit, onDelete, onProgressUpdated }: BookCardProps) {
  const currentPage = book.current_page ?? book.currentPage ?? 0;
  const totalPages = book.total_pages ?? book.totalPages ?? 1;

  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [pageInput, setPageInput] = useState<number>(currentPage);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showLendModal, setShowLendModal] = useState(false);
  const [lendError, setLendError] = useState<string | null>(null);

  const handleReturn = async () => {
    setLendError(null);
    setReturning(true);
    try {
      await returnBook(book.id);
      if (onProgressUpdated) onProgressUpdated();
    } catch (err) {
      setLendError(err instanceof Error ? err.message : "Failed to return book.");
    } finally {
      setReturning(false);
    }
  };

  const rawPercent = Math.min(100, (currentPage / (totalPages || 1)) * 100);
  const progressPercent = Number.isInteger(rawPercent)
    ? rawPercent.toString()
    : (Math.round(rawPercent * 10) / 10).toFixed(1);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "FINISHED":
        return "#10b981"; // green
      case "READING":
        return "#00c2ff"; // cyan
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
    if (pageInput > totalPages) {
      setProgressError(`Page cannot exceed total pages (${totalPages}).`);
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
            whiteSpace: "nowrap",
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
              {currentPage} / {totalPages} pages ({progressPercent}%)
            </span>
            {!isEditingProgress && (
              <button
                onClick={() => {
                  setPageInput(currentPage);
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
                className={`input-field${progressError ? " error" : ""}`}
                style={{ width: "90px", padding: "var(--space-1) var(--space-2)", fontSize: "var(--font-size-2xl)" }}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-sm"
              >
                {loading ? <Spinner /> : null} Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProgress(false);
                  setProgressError(null);
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
            </div>

            {/* Inline Error Message */}
            {progressError && (
              <p className="form-error" style={{ marginTop: "var(--space-2)" }}>
                {progressError}
              </p>
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
        <p className="form-error">
          {lendError}
        </p>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-2)",
          marginTop: "auto",
          paddingTop: "var(--space-2)",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setShowLendModal(true)}
          className="btn btn-ghost btn-sm"
          style={{
            color: "var(--color-accent-primary)",
            borderColor: "var(--color-border-muted)",
            background: "var(--color-accent-bg)",
          }}
        >
          🤝 Lend
        </button>
        <button
          onClick={handleReturn}
          disabled={returning}
          className="btn btn-secondary btn-sm"
          title="Mark returned if lent"
        >
          {returning ? <Spinner /> : "↩️"} Return
        </button>
        <button
          onClick={() => onEdit(book)}
          className="btn btn-secondary btn-sm"
        >
          Edit
        </button>
        {confirmDelete ? (
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <button
              onClick={() => {
                onDelete(book.id);
                setConfirmDelete(false);
              }}
              className="btn btn-danger btn-sm"
            >
              Confirm?
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn btn-danger btn-sm"
          >
            Delete
          </button>
        )}
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
