"use client";

import { useState, useEffect, FormEvent } from "react";
import { Book, BookFile, BookStatus } from "@/types";
import { FormField, Input, SelectField, TextareaField, Spinner, ErrorBanner } from "@/components/ui";
import { FileDropzone } from "./FileDropzone";
import { FileCard } from "./FileCard";
import { fetchApi, uploadWithProgress } from "@/lib/api/client";

export interface BookFormData {
  title: string;
  author: string;
  status: BookStatus;
  total_pages?: number;
  totalPages?: number;
  current_page?: number;
  currentPage?: number;
  rating?: number | null;
  notes?: string | null;
}

interface BookFormProps {
  initialData?: Book | null;
  onSubmit: (data: BookFormData, file?: File | null) => Promise<void>;
  onCancel: () => void;
}

export function BookForm({ initialData, onSubmit, onCancel }: BookFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [author, setAuthor] = useState(initialData?.author || "");
  const [status, setStatus] = useState<BookStatus>(initialData?.status || "WANT_TO_READ");
  const [totalPages, setTotalPages] = useState<number>(
    initialData?.total_pages ?? initialData?.totalPages ?? 100
  );
  const [currentPage, setCurrentPage] = useState<number>(
    initialData?.current_page ?? initialData?.currentPage ?? 0
  );
  const [rating, setRating] = useState<number | undefined>(
    initialData?.rating ?? undefined
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  
  const [currentFile, setCurrentFile] = useState<BookFile | null>(initialData?.file ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      await onSubmit(
        {
          title: title.trim(),
          author: author.trim(),
          status,
          total_pages: Number(totalPages),
          totalPages: Number(totalPages),
          current_page: Number(currentPage),
          currentPage: Number(currentPage),
          rating: rating ? Number(rating) : undefined,
          notes: notes.trim() || undefined,
        },
        selectedFile
      );
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : "Failed to save book." });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    if (initialData?.id) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadedFile = await uploadWithProgress<BookFile>(
          `/api/v1/books/${initialData.id}/upload`,
          formData,
          (percent) => setUploadProgress(percent)
        );
        setCurrentFile(uploadedFile);
        if (uploadedFile.page_count && uploadedFile.page_count > 0) {
          setTotalPages(uploadedFile.page_count);
        }
      } catch (err: any) {
        setUploadError(err.message || "Failed to upload file");
      } finally {
        setIsUploading(false);
      }
    } else {
      setSelectedFile(file);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName);
      }
    }
  };

  const handleRemoveFile = async () => {
    if (!initialData?.id) {
      setSelectedFile(null);
      return;
    }
    try {
      await fetchApi(`/api/v1/books/${initialData.id}/file`, {
        method: "DELETE",
      });
      setCurrentFile(null);
    } catch (err: any) {
      setUploadError(err.message || "Failed to remove file");
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

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label
              style={{
                display: "block",
                fontSize: "var(--font-size-sm, 13px)",
                fontWeight: 500,
                color: "var(--color-text-secondary, #94a3b8)",
                marginBottom: "var(--space-2, 6px)",
              }}
            >
              Book Document (PDF or EPUB)
            </label>
            {currentFile && initialData?.id ? (
              <FileCard
                file={currentFile}
                bookId={initialData.id}
                canDelete={true}
                onDelete={handleRemoveFile}
              />
            ) : selectedFile ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--color-surface-raised, #111d33)",
                  border: "1px solid var(--color-border-default, rgba(148, 163, 184, 0.12))",
                  borderRadius: "var(--radius-md, 10px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>📄</span>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--color-text-primary, #e2e8f0)",
                      }}
                    >
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary, #94a3b8)" }}>
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to upload with book
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="btn btn-ghost btn-xs"
                  style={{ color: "#fb7185" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <FileDropzone
                onFileSelect={handleFileSelect}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                error={uploadError}
              />
            )}
          </div>


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
