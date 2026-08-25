"use client";

import { useState, useEffect, FormEvent } from "react";
import { Book, BookStatus } from "@/types";
import { FormField, Input, SelectField, TextareaField, Spinner, ErrorBanner } from "@/components/ui";

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
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const validateField = (name: string, val: any) => {
    const newErrors = { ...errors };
    if (name === "title") {
      if (!String(val).trim()) newErrors.title = "Title is required.";
      else delete newErrors.title;
    }
    if (name === "author") {
      if (!String(val).trim()) newErrors.author = "Author is required.";
      else delete newErrors.author;
    }
    if (name === "totalPages") {
      const num = Number(val);
      if (isNaN(num) || num < 1) newErrors.totalPages = "Total pages must be at least 1.";
      else delete newErrors.totalPages;
      // also recheck currentPage if totalPages changed
      if (currentPage > num && num >= 1) {
        newErrors.currentPage = `Page cannot exceed total pages (${num}).`;
      } else if (currentPage <= num && currentPage >= 0) {
        delete newErrors.currentPage;
      }
    }
    if (name === "currentPage") {
      const num = Number(val);
      if (isNaN(num) || num < 0) newErrors.currentPage = "Page cannot be negative.";
      else if (num > totalPages) newErrors.currentPage = `Page cannot exceed total pages (${totalPages}).`;
      else delete newErrors.currentPage;
    }
    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const titleErr = !title.trim() ? "Title is required." : "";
    const authorErr = !author.trim() ? "Author is required." : "";
    const tpErr = totalPages < 1 ? "Total pages must be at least 1." : "";
    const cpErr = currentPage < 0 ? "Page cannot be negative." : currentPage > totalPages ? `Page cannot exceed total pages (${totalPages}).` : "";

    const newErrors: Record<string, string> = {};
    if (titleErr) newErrors.title = titleErr;
    if (authorErr) newErrors.author = authorErr;
    if (tpErr) newErrors.totalPages = tpErr;
    if (cpErr) newErrors.currentPage = cpErr;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
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
      setErrors({ _form: err instanceof Error ? err.message : "Failed to save book." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "var(--space-4)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="design-card"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-3)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-h2)", marginBottom: "var(--space-6)", color: "var(--color-text-tertiary)", fontWeight: "700", letterSpacing: "-0.02em" }}>
          {initialData ? "✏️ Edit Book" : "✨ Add New Book"}
        </h2>

        {errors._form && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <ErrorBanner message={errors._form} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <FormField label="Title" required error={errors.title}>
            <Input
              type="text"
              value={title}
              error={!!errors.title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (submitted) validateField("title", e.target.value);
              }}
              onBlur={() => validateField("title", title)}
              placeholder="e.g. Designing Data-Intensive Applications"
            />
          </FormField>

          <FormField label="Author" required error={errors.author}>
            <Input
              type="text"
              value={author}
              error={!!errors.author}
              onChange={(e) => {
                setAuthor(e.target.value);
                if (submitted) validateField("author", e.target.value);
              }}
              onBlur={() => validateField("author", author)}
              placeholder="e.g. Martin Kleppmann"
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <FormField label="Status">
              <SelectField
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
              >
                <option value="WANT_TO_READ">Want to Read</option>
                <option value="READING">Reading</option>
                <option value="FINISHED">Finished</option>
              </SelectField>
            </FormField>

            <FormField label="Rating (1–5)">
              <SelectField
                value={rating || ""}
                onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">No rating</option>
                <option value="1">⭐ 1 star</option>
                <option value="2">⭐⭐ 2 stars</option>
                <option value="3">⭐⭐⭐ 3 stars</option>
                <option value="4">⭐⭐⭐⭐ 4 stars</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 stars</option>
              </SelectField>
            </FormField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <FormField label="Total Pages" required error={errors.totalPages}>
              <Input
                type="number"
                min="1"
                value={totalPages}
                error={!!errors.totalPages}
                onChange={(e) => {
                  setTotalPages(Number(e.target.value));
                  if (submitted) validateField("totalPages", e.target.value);
                }}
                onBlur={() => validateField("totalPages", totalPages)}
              />
            </FormField>

            <FormField label="Current Page" error={errors.currentPage}>
              <Input
                type="number"
                min="0"
                value={currentPage}
                error={!!errors.currentPage}
                onChange={(e) => {
                  setCurrentPage(Number(e.target.value));
                  if (submitted) validateField("currentPage", e.target.value);
                }}
                onBlur={() => validateField("currentPage", currentPage)}
              />
            </FormField>
          </div>

          <FormField label="Notes">
            <TextareaField
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional personal notes, takeaways, or quotes..."
            />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onCancel}
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
              {loading ? "Saving..." : initialData ? "Update Book" : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
