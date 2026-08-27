"use client";

import { useState, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import { Book } from "@/types";
import { lendBook, returnBook } from "../api";
import { FormField, Input, Spinner, ErrorBanner, useToast } from "@/components/ui";

interface LendBookModalProps {
  book: Book;
  availableBooks?: Book[];
  onClose: () => void;
  onSuccess: () => void;
}

export function LendBookModal({ book: initialBook, availableBooks, onClose, onSuccess }: LendBookModalProps) {
  const { success, error: toastError } = useToast();
  const [selectedBookId, setSelectedBookId] = useState(initialBook?.id || "");
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeBook = (availableBooks && availableBooks.find((b) => b.id === selectedBookId)) || initialBook;

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const validateEmail = (val: string) => {
    const newErrors = { ...errors };
    const trimmed = val.trim();
    if (!trimmed) {
      newErrors.email = "Borrower email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      newErrors.email = "Please enter a valid email address.";
    } else {
      delete newErrors.email;
    }
    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!activeBook) {
      setErrors({ _form: "Please select a book to lend." });
      return;
    }

    const validation = validateEmail(borrowerEmail);
    if (validation.email) {
      return;
    }

    setLoading(true);
    try {
      await lendBook(activeBook.id, { borrower_email: borrowerEmail.trim() });
      success(`Lent "${activeBook.title}" to ${borrowerEmail}`, "PostgreSQL concurrency lock registered.");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to lend book.";
      setErrors({ _form: msg });
      toastError("Lend failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!activeBook) return;
    setReturning(true);
    try {
      await returnBook(activeBook.id);
      success(`Returned "${activeBook.title}"`, "Book returned and is now available in your library.");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to return book.";
      if (msg.includes("not currently lent") || msg.includes("NO_ACTIVE_LENDING") || msg.includes("404")) {
        toastError("Not Lent Out", `"${activeBook.title}" is not currently lent out to any borrower.`);
      } else {
        toastError("Return Failed", msg);
      }
    } finally {
      setReturning(false);
    }
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: "520px",
          width: "100%",
          padding: "24px",
          position: "relative",
          zIndex: 10000,
          background: "#0c1527",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          borderRadius: "var(--radius-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <span className="badge badge-lent" style={{ marginBottom: "6px" }}>Lending Transaction</span>
            <h2 style={{ fontSize: "20px", color: "#ffffff", fontWeight: 800, letterSpacing: "-0.02em" }}>
              🤝 Lend Book
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-xs" style={{ fontSize: "16px" }}>✕</button>
        </div>

        {availableBooks && availableBooks.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
              Selected Book <span style={{ color: "var(--color-accent-danger)" }}>*</span>
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="input-field"
              style={{ width: "100%" }}
            >
              {availableBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  📖 {b.title} ({b.author})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeBook && !availableBooks && (
          <div
            className="glass-panel"
            style={{
              padding: "10px 14px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}
          >
            <span style={{ fontSize: "24px" }}>📖</span>
            <div>
              <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px" }}>{activeBook.title}</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>by {activeBook.author}</div>
            </div>
          </div>
        )}

        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "14px" }}>
          Lending grants the recipient a read-only borrower view of this book while preserving your library ownership.
        </p>

        {/* Concurrency Guarantee Banner */}
        <div
          className="glass-panel"
          style={{
            padding: "10px 12px",
            marginBottom: "16px",
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            borderLeft: "3px solid #38bdf8",
          }}
        >
          <strong style={{ color: "#38bdf8" }}>🔒 Concurrency Guarantee:</strong> Single active loan per book enforced by PostgreSQL partial unique index <code>WHERE returned_at IS NULL</code>.
        </div>

        {errors._form && (
          <div style={{ marginBottom: "16px" }}>
            <ErrorBanner message={errors._form} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FormField label="Borrower Email Address" required error={errors.email}>
            <Input
              type="email"
              placeholder="e.g. bob@example.com"
              value={borrowerEmail}
              error={!!errors.email}
              onChange={(e) => {
                setBorrowerEmail(e.target.value);
                if (submitted) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(borrowerEmail)}
            />
          </FormField>

          {/* Quick Demo User Selector */}
          <div>
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "block", marginBottom: "6px" }}>
              Quick Evaluation Recipients:
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setBorrowerEmail("bob@example.com")}
                className="btn btn-secondary btn-xs"
              >
                ✏️ Bob (bob@example.com)
              </button>
              <button
                type="button"
                onClick={() => setBorrowerEmail("charlie@example.com")}
                className="btn btn-secondary btn-xs"
              >
                👁️ Charlie (charlie@example.com)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              onClick={handleReturn}
              disabled={returning}
              className="btn btn-secondary btn-xs"
              title="Mark this book as returned if it is currently lent out"
            >
              {returning ? <Spinner /> : "↩️ Mark as Returned"}
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                {loading ? <Spinner /> : "Confirm Lending"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}



