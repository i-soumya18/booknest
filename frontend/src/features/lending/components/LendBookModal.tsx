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
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
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
        <h2 style={{ fontSize: "var(--font-size-h2)", color: "var(--color-text-tertiary)", marginBottom: "var(--space-2)", fontWeight: "700", letterSpacing: "-0.02em" }}>
          🤝 Lend &quot;{book.title}&quot;
        </h2>
        <p style={{ fontSize: "var(--font-size-3xl)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
          Enter the registered email of the user you want to lend this book to.
        </p>

        {error && (
          <div
            style={{
              background: "var(--color-error-bg)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "var(--color-error)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-5)",
              fontSize: "var(--font-size-2xl)",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--font-size-2xl)",
                fontWeight: 500,
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Borrower Email *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. bob@example.com"
              value={borrowerEmail}
              onChange={(e) => setBorrowerEmail(e.target.value)}
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "var(--space-3) var(--space-6)",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                fontSize: "var(--font-size-2xl)",
                cursor: "pointer",
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
                fontSize: "var(--font-size-2xl)",
                fontWeight: 700,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: "var(--shadow-2)",
                transition: "all var(--motion-fast)",
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
