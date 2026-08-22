"use client";

import { useState } from "react";
import { Book } from "@/types";
import { lendBook } from "../api";

interface LendBookModalProps {
  book: Book;
  onClose: () => void;
  onSuccess: () => void;
}

export function LendBookModal({ book, onClose, onSuccess }: LendBookModalProps) {
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!borrowerEmail.trim()) {
      setError("Please enter borrower email.");
      return;
    }

    setLoading(true);
    try {
      await lendBook(book.id, { borrower_email: borrowerEmail.trim() });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lend book.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "450px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Lend &quot;{book.title}&quot;
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          Enter the registered email of the user you want to lend this book to.
        </p>

        {error && (
          <div
            style={{
              background: "#ef444415",
              border: "1px solid #ef444440",
              color: "var(--error-color)",
              padding: "0.75rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: "0.4rem",
              }}
            >
              Borrower Email *
            </label>
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={borrowerEmail}
              onChange={(e) => setBorrowerEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                fontSize: "0.875rem",
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
                borderRadius: "6px",
                background: "var(--accent-color)",
                color: "#fff",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Lending..." : "Confirm Lend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
