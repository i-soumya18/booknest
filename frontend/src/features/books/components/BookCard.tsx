"use client";

import { useState } from "react";
import { Book } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { LendBookModal, returnBook } from "@/features/lending";
import { Spinner, useToast } from "@/components/ui";

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onLend?: (book: Book) => void;
  onProgressUpdated?: () => void;
}

export function BookCard({ book, onEdit, onDelete, onLend, onProgressUpdated }: BookCardProps) {

  const currentPage = book.current_page ?? book.currentPage ?? 0;
  const totalPages = book.total_pages ?? book.totalPages ?? 1;
  const { success, error: toastError } = useToast();

  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [pageInput, setPageInput] = useState<number>(currentPage);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showLendModal, setShowLendModal] = useState(false);
  const [lendError, setLendError] = useState<string | null>(null);

  const rawPercent = Math.min(100, Math.max(0, (currentPage / (totalPages || 1)) * 100));
  const progressPercent = Number.isInteger(rawPercent)
    ? rawPercent.toString()
    : (Math.round(rawPercent * 10) / 10).toFixed(1);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FINISHED":
        return <span className="badge badge-finished">Finished</span>;
      case "READING":
        return <span className="badge badge-reading">Reading</span>;
      case "WANT_TO_READ":
      default:
        return <span className="badge badge-want">Want to Read</span>;
    }
  };

  const getCoverGradient = (title: string) => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
      "linear-gradient(135deg, #065f46 0%, #0f172a 100%)",
      "linear-gradient(135deg, #701a75 0%, #0f172a 100%)",
      "linear-gradient(135deg, #831843 0%, #0f172a 100%)",
      "linear-gradient(135deg, #1e293b 0%, #090e17 100%)",
      "linear-gradient(135deg, #0c4a6e 0%, #1e1b4b 100%)",
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  const handleUpdatePageValue = async (newPage: number) => {
    if (newPage < 0 || newPage > totalPages) return;
    setLoading(true);
    try {
      await fetchApi(`/api/v1/books/${book.id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ current_page: Number(newPage) }),
      });
      if (newPage === totalPages) {
        success(`🎉 Completed "${book.title}"!`, "Book status automatically updated to Finished in PostgreSQL.");
      } else {
        success(`Progress saved: page ${newPage}/${totalPages}`);
      }
      setIsEditingProgress(false);
      if (onProgressUpdated) onProgressUpdated();
    } catch (err) {
      toastError("Failed to update progress", err instanceof Error ? err.message : "Error saving");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pageInput < 0 || pageInput > totalPages) {
      setProgressError(`Must be between 0 and ${totalPages}`);
      return;
    }
    await handleUpdatePageValue(pageInput);
  };

  const handleReturn = async () => {
    setLendError(null);
    setReturning(true);
    try {
      await returnBook(book.id);
      success(`Returned "${book.title}"`, "Book returned and is now available in your library.");
      if (onProgressUpdated) onProgressUpdated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to return book.";
      if (msg.includes("not currently lent") || msg.includes("NO_ACTIVE_LENDING") || msg.includes("404")) {
        toastError("Not Lent Out", `"${book.title}" is not currently lent out to any borrower.`);
      } else {
        toastError("Return Failed", msg);
      }
    } finally {
      setReturning(false);
    }
  };


  return (
    <div
      className="design-card"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 3D Stylized Book Header & Spine Banner */}
      <div
        style={{
          background: getCoverGradient(book.title),
          padding: "16px 18px",
          borderBottom: "1px solid var(--color-border-default)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        {/* Book Spine accent */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "5px",
            background: "rgba(255, 255, 255, 0.25)",
            boxShadow: "inset 1px 0 2px rgba(0,0,0,0.4)",
          }}
        />

        <div style={{ paddingLeft: "8px", flex: 1, paddingRight: "10px" }}>
          <h3
            style={{
              fontSize: "17px",
              color: "#ffffff",
              fontWeight: "700",
              lineHeight: 1.3,
              marginBottom: "4px",
              letterSpacing: "-0.01em",
            }}
          >
            {book.title}
          </h3>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
            by <strong style={{ color: "var(--color-text-primary)" }}>{book.author}</strong>
          </p>
        </div>

        <div>
          {getStatusBadge(book.status)}
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
        {/* Rating & Notes */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {book.rating ? (
            <div style={{ fontSize: "15px", color: "#fbbf24", letterSpacing: "2px" }} title={`${book.rating} out of 5 stars`}>
              {"★".repeat(book.rating)}
              {"☆".repeat(5 - book.rating)}
            </div>
          ) : (
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic" }}>Not rated</span>
          )}

          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            📖 {totalPages} pages
          </span>
        </div>

        {book.notes && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              fontStyle: "italic",
              lineHeight: 1.4,
              background: "rgba(255, 255, 255, 0.02)",
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              borderLeft: "2px solid rgba(56, 189, 248, 0.4)",
            }}
          >
            &quot;{book.notes}&quot;
          </p>
        )}

        {/* Interactive Reading Progress Stepper & Slider */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
              marginBottom: "6px",
            }}
          >
            <span style={{ color: "var(--color-text-secondary)" }}>Progress</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>
                {currentPage} / {totalPages} pages
              </span>
              <span className="badge badge-reading" style={{ fontSize: "10px", padding: "1px 5px" }}>
                {progressPercent}%
              </span>
              {!isEditingProgress && (
                <button
                  onClick={() => {
                    setPageInput(currentPage);
                    setProgressError(null);
                    setIsEditingProgress(true);
                  }}
                  title="Edit page number"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-accent-primary)",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontSize: "13px",
                  }}
                >
                  ✏️
                </button>
              )}
            </div>
          </div>

          {/* Progress Visual Bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: `${rawPercent}%`,
                height: "100%",
                background:
                  book.status === "FINISHED"
                    ? "#10b981"
                    : book.status === "READING"
                    ? "#38bdf8"
                    : "#f59e0b",
                transition: "width var(--motion-normal)",
              }}
            />
          </div>

          {/* Quick Page Steppers (+10, -10, +1) */}
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)", marginRight: "2px" }}>Quick:</span>
            <button
              onClick={() => handleUpdatePageValue(Math.max(0, currentPage - 10))}
              disabled={loading || currentPage <= 0}
              className="btn btn-secondary btn-xs"
              style={{ padding: "1px 6px", fontSize: "11px" }}
              title="Back 10 pages"
            >
              -10
            </button>
            <button
              onClick={() => handleUpdatePageValue(Math.min(totalPages, currentPage + 10))}
              disabled={loading || currentPage >= totalPages}
              className="btn btn-secondary btn-xs"
              style={{ padding: "1px 6px", fontSize: "11px" }}
              title="Forward 10 pages"
            >
              +10
            </button>
            <button
              onClick={() => handleUpdatePageValue(totalPages)}
              disabled={loading || currentPage >= totalPages}
              className="btn btn-primary btn-xs"
              style={{ padding: "1px 6px", fontSize: "11px", marginLeft: "auto" }}
              title="Finish book immediately"
            >
              Mark 100%
            </button>
          </div>

          {/* Direct Input Form */}
          {isEditingProgress && (
            <form
              onSubmit={handleFormSubmit}
              style={{
                marginTop: "10px",
                padding: "10px",
                background: "rgba(8, 13, 22, 0.8)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Page:</label>
                <input
                  type="number"
                  min="0"
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => {
                    setPageInput(Number(e.target.value));
                    setProgressError(null);
                  }}
                  className={`input-field${progressError ? " error" : ""}`}
                  style={{ width: "80px", padding: "3px 8px", fontSize: "13px" }}
                />
                <button type="submit" disabled={loading} className="btn btn-primary btn-xs">
                  {loading ? <Spinner /> : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProgress(false)}
                  className="btn btn-ghost btn-xs"
                >
                  Cancel
                </button>
              </div>
              {progressError && <p className="form-error" style={{ marginTop: "4px" }}>{progressError}</p>}
            </form>
          )}
        </div>

        {lendError && <p className="form-error">{lendError}</p>}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "6px",
            marginTop: "auto",
            paddingTop: "10px",
            borderTop: "1px solid var(--color-border-subtle)",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              if (onLend) {
                onLend(book);
              } else {
                setShowLendModal(true);
              }
            }}
            className="btn btn-ghost btn-xs"
            style={{
              color: "var(--color-accent-primary)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              background: "rgba(56, 189, 248, 0.08)",
            }}
          >
            🤝 Lend
          </button>
          <button
            onClick={handleReturn}
            disabled={returning}
            className="btn btn-secondary btn-xs"
            title="Mark returned if lent out"
          >
            {returning ? <Spinner /> : "↩️"} Return
          </button>
          <button onClick={() => onEdit(book)} className="btn btn-secondary btn-xs">
            ✏️ Edit
          </button>

          {confirmDelete ? (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => {
                  onDelete(book.id);
                  setConfirmDelete(false);
                }}
                className="btn btn-danger btn-xs"
              >
                Confirm?
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost btn-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn btn-danger btn-xs">
              🗑️
            </button>
          )}
        </div>
      </div>

      {!onLend && showLendModal && (
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


