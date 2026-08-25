"use client";

import { useState, useEffect, FormEvent } from "react";
import { Book } from "@/types";
import { lendBook } from "../api";
import { FormField, Input, Spinner, ErrorBanner } from "@/components/ui";

interface LendBookModalProps {
  book: Book;
  onClose: () => void;
  onSuccess: () => void;
}

export function LendBookModal({ book, onClose, onSuccess }: LendBookModalProps) {
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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

    const validation = validateEmail(borrowerEmail);
    if (validation.email) {
      return;
    }

    setLoading(true);
    try {
      await lendBook(book.id, { borrower_email: borrowerEmail.trim() });
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : "Failed to lend book." });
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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

        {errors._form && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <ErrorBanner message={errors._form} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <FormField label="Borrower Email" required error={errors.email}>
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? <Spinner /> : null}
              {loading ? "Lending..." : "Confirm Lend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
