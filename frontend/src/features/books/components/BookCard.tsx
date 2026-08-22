"use client";

import { Book } from "@/types";

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
}

export function BookCard({ book, onEdit, onDelete }: BookCardProps) {
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

      {/* Progress Bar */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",

            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            marginBottom: "0.25rem",
          }}
        >
          <span>Progress</span>
          <span>
            {book.currentPage} / {book.totalPages} pages ({progressPercent}%)
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "6px",
            background: "var(--bg-card)",
            borderRadius: "3px",
            overflow: "hidden",
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
