"use client";

import { useEffect, useState, useCallback } from "react";
import { Book, BookSortBy, BookStatus, PaginatedResponse, SortOrder } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "./BookCard";
import { BookForm, BookFormData } from "./BookForm";

export function BookList() {
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<Book>>({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookStatus | "">("");
  const [sortBy, setSortBy] = useState<BookSortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter) params.append("status", statusFilter);
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

      const data = await fetchApi<PaginatedResponse<Book>>(`/api/v1/books?${params.toString()}`);
      setPaginatedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleCreateOrUpdate = async (formData: BookFormData) => {
    if (editingBook) {
      await fetchApi<Book>(`/api/v1/books/${editingBook.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } else {
      await fetchApi<Book>("/api/v1/books", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    }
    setIsFormOpen(false);
    setEditingBook(null);
    loadBooks();
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      await fetchApi(`/api/v1/books/${bookId}`, { method: "DELETE" });
      loadBooks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete book.");
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div style={{ padding: "1.5rem 0" }}>
      {/* Header & Primary Action */}
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

      {/* Filter, Search & Sorting Bar */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Search Input */}
        <div style={{ flex: "1 1 250px" }}>
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page on search change
            }}
            style={{
              width: "100%",
              padding: "0.55rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
            }}
          />
        </div>

        {/* Filters and Sorting Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as BookStatus | "");
              setPage(1);
            }}
            style={{
              padding: "0.55rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
            }}
          >
            <option value="">All Statuses</option>
            <option value="WANT_TO_READ">Want to Read</option>
            <option value="READING">Reading</option>
            <option value="FINISHED">Finished</option>
          </select>

          {/* Sort By Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as BookSortBy)}
            style={{
              padding: "0.55rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
            }}
          >
            <option value="created_at">Date Added</option>
            <option value="title">Title</option>
            <option value="rating">Rating</option>
          </select>

          {/* Sort Direction Toggle */}
          <button
            onClick={toggleSortOrder}
            title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
            style={{
              padding: "0.55rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
          Loading library...
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
      {!loading && !error && paginatedData.items.length === 0 && (
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
            No books found matching your criteria.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Try adjusting your search terms or filters.
          </p>
        </div>
      )}

      {/* Success State */}
      {!loading && !error && paginatedData.items.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            {paginatedData.items.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onEdit={(b) => {
                  setEditingBook(b);
                  setIsFormOpen(true);
                }}
                onDelete={handleDelete}
                onProgressUpdated={loadBooks}
              />

            ))}
          </div>

          {/* Server-Side Pagination Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "0.75rem 1.25rem",
            }}
          >
            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Showing {paginatedData.items.length} of {paginatedData.total} books (Page {paginatedData.page} of{" "}
              {paginatedData.totalPages})
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  padding: "0.35rem 0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>

              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)",
                  color: page <= 1 ? "var(--text-secondary)" : "var(--text-primary)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Previous
              </button>

              <button
                disabled={page >= paginatedData.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)",
                  color: page >= paginatedData.totalPages ? "var(--text-secondary)" : "var(--text-primary)",
                  cursor: page >= paginatedData.totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
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
