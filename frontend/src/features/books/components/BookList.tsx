"use client";

import { useEffect, useState, useCallback } from "react";
import { Book } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "./BookCard";
import { BookForm, BookFormData } from "./BookForm";

export function BookList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<Book[]>("/api/v1/books");
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleCreateOrUpdate = async (formData: BookFormData) => {
    if (editingBook) {
      const updated = await fetchApi<Book>(`/api/v1/books/${editingBook.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } else {
      const created = await fetchApi<Book>("/api/v1/books", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setBooks((prev) => [created, ...prev]);
    }
    setIsFormOpen(false);
    setEditingBook(null);
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      await fetchApi(`/api/v1/books/${bookId}`, { method: "DELETE" });
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete book.");
    }
  };

  return (
    <div style={{ padding: "1.5rem 0" }}>
      {/* Header Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", color: "var(--text-primary)" }}>My Book Library</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Manage and track your reading collection.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBook(null);
            setIsFormOpen(true);
          }}
          style={{
            padding: "0.6rem 1.2rem",
            background: "var(--accent-color)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Book
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
          Loading your book collection...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            background: "#ef444420",
            border: "1px solid #ef444440",
            color: "var(--error-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={loadBooks}
            style={{
              padding: "0.4rem 0.8rem",
              background: "var(--error-color)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && books.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "var(--bg-surface)",
            borderRadius: "8px",
            border: "1px dashed var(--border-color)",
          }}
        >
          <p style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            No books in your library yet.
          </p>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Click below to add your first book.
          </p>

          <button
            onClick={() => {
              setEditingBook(null);
              setIsFormOpen(true);
            }}
            style={{
              padding: "0.6rem 1.2rem",
              background: "var(--accent-color)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add First Book
          </button>
        </div>
      )}

      {/* Success State */}
      {!loading && !error && books.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={(b) => {
                setEditingBook(b);
                setIsFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <BookForm
          initialData={editingBook}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingBook(null);
          }}
        />
      )}
    </div>
  );
}
