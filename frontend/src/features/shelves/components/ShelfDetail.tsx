"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Book, PaginatedResponse, ShelfDetail as IShelfDetail } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "@/features/books/components/BookCard";

interface ShelfDetailProps {
  shelfId: string;
}

export function ShelfDetailView({ shelfId }: ShelfDetailProps) {
  const [shelfDetail, setShelfDetail] = useState<IShelfDetail | null>(null);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);

  const loadShelf = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<IShelfDetail>(`/api/v1/shelves/${shelfId}`);
      setShelfDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shelf details.");
    } finally {
      setLoading(false);
    }
  }, [shelfId]);

  const loadAvailableBooks = useCallback(async () => {
    try {
      const res = await fetchApi<PaginatedResponse<Book>>("/api/v1/books?page_size=100");
      setAvailableBooks(res.items);
    } catch {
      // Ignore errors loading available books
    }
  }, []);

  useEffect(() => {
    loadShelf();
  }, [loadShelf]);

  const handleAddBook = async () => {
    if (!selectedBookId) return;
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/books/${selectedBookId}`, {
        method: "POST",
      });
      setIsAddBookOpen(false);
      setSelectedBookId("");
      loadShelf();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add book to shelf.");
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    if (!confirm("Remove this book from the shelf? (Book will remain in your library)")) return;
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/books/${bookId}`, {
        method: "DELETE",
      });
      loadShelf();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove book from shelf.");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
        Loading shelf contents...
      </div>
    );
  }

  if (error || !shelfDetail) {
    return (
      <div style={{ padding: "1.5rem 0" }}>
        <Link href="/shelves" style={{ color: "var(--accent-color)", textDecoration: "none" }}>
          ← Back to Shelves
        </Link>
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "8px",
            background: "#ef444420",
            border: "1px solid #ef444440",
            color: "var(--error-color)",
          }}
        >
          {error || "Shelf not found."}
        </div>
      </div>
    );
  }

  // Filter out books already on this shelf
  const booksNotOnShelf = availableBooks.filter(
    (b) => !shelfDetail.books.some((sb) => sb.id === b.id)
  );

  return (
    <div style={{ padding: "1.5rem 0" }}>
      <Link href="/shelves" style={{ color: "var(--accent-color)", textDecoration: "none", fontSize: "0.9rem" }}>
        ← Back to Shelves
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          margin: "1rem 0 1.5rem 0",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.75rem", color: "var(--text-primary)" }}>{shelfDetail.name}</h2>
          {shelfDetail.description && (
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              {shelfDetail.description}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            loadAvailableBooks();
            setIsAddBookOpen(true);
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
          + Add Book to Shelf
        </button>
      </div>

      {/* Books Grid */}
      {shelfDetail.books.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            background: "var(--bg-surface)",
            borderRadius: "8px",
            border: "1px dashed var(--border-color)",
          }}
        >
          <p style={{ fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            This shelf is empty.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Add books from your library to keep them organized on this shelf.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {shelfDetail.books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => {}} // No inline edit inside shelf view needed
              onDelete={handleRemoveBook} // Overridden to remove from shelf
            />
          ))}
        </div>
      )}

      {/* Modal to add existing book */}
      {isAddBookOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "450px",
              padding: "1.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
              Add Book to {shelfDetail.name}
            </h3>

            {booksNotOnShelf.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                All your library books are already on this shelf!
              </p>
            ) : (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Select Book
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">Select a book...</option>
                  {booksNotOnShelf.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} by {b.author}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setIsAddBookOpen(false)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBookId}
                onClick={handleAddBook}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  background: "var(--accent-color)",
                  color: "#fff",
                  border: "none",
                  cursor: selectedBookId ? "pointer" : "not-allowed",
                  fontWeight: 600,
                  opacity: selectedBookId ? 1 : 0.5,
                }}
              >
                Add Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
