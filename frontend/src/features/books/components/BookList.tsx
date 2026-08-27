"use client";

import { useEffect, useState, useCallback } from "react";
import { Book, BookSortBy, BookStatus, PaginatedResponse, SortOrder } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "./BookCard";
import { BookForm, BookFormData } from "./BookForm";
import { Skeleton, SkeletonCard, ErrorBanner } from "@/components/ui";

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

      const data = await fetchApi<any>(`/api/v1/books?${params.toString()}`);
      const normalizedItems: Book[] = (data.items || []).map((b: any) => ({
        ...b,
        totalPages: b.total_pages ?? b.totalPages ?? 1,
        total_pages: b.total_pages ?? b.totalPages ?? 1,
        currentPage: b.current_page ?? b.currentPage ?? 0,
        current_page: b.current_page ?? b.currentPage ?? 0,
        ownerId: b.owner_id ?? b.ownerId,
        owner_id: b.owner_id ?? b.ownerId,
        createdAt: b.created_at ?? b.createdAt,
        created_at: b.created_at ?? b.createdAt,
        updatedAt: b.updated_at ?? b.updatedAt,
        updated_at: b.updated_at ?? b.updatedAt,
        finishedAt: b.finished_at ?? b.finishedAt,
        finished_at: b.finished_at ?? b.finishedAt,
      }));
      const total = data.total ?? 0;
      const totalPages = data.total_pages ?? data.totalPages ?? (Math.ceil(total / (data.page_size || pageSize)) || 0);

      setPaginatedData({
        items: normalizedItems,
        page: data.page ?? page,
        pageSize: data.page_size ?? data.pageSize ?? pageSize,
        total,
        totalPages,
      });
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
    const payload = {
      title: formData.title,
      author: formData.author,
      status: formData.status,
      total_pages: formData.total_pages ?? formData.totalPages,
      current_page: formData.current_page ?? formData.currentPage ?? 0,
      rating: formData.rating,
      notes: formData.notes,
    };
    if (editingBook) {
      await fetchApi<Book>(`/api/v1/books/${editingBook.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await fetchApi<Book>("/api/v1/books", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    setIsFormOpen(false);
    setEditingBook(null);
    loadBooks();
  };

  const handleDelete = async (bookId: string) => {
    setError(null);
    try {
      await fetchApi(`/api/v1/books/${bookId}`, { method: "DELETE" });
      loadBooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete book.");
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div style={{ padding: "var(--space-6) 0" }}>
      {/* Header & Primary Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-8)",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div className="section-header" style={{ marginBottom: 0 }}>
          <h2>My Book Library</h2>
          <p>Manage, filter, and track your reading collection with server-side pagination.</p>
        </div>
        <button
          onClick={() => {
            setEditingBook(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary"
        >
          + Add Book
        </button>
      </div>

      {/* Filter, Search & Sorting Bar */}
      <div
        className="design-card"
        style={{
          padding: "var(--space-5)",
          marginBottom: "var(--space-8)",
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Search Input */}
        <div style={{ flex: "1 1 280px" }}>
          <input
            type="text"
            placeholder="🔍 Search by title or author..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field"
          />
        </div>

        {/* Filters and Sorting Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as BookStatus | "");
              setPage(1);
            }}
            className="input-field"
            style={{ width: "auto", cursor: "pointer" }}
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
            className="input-field"
            style={{ width: "auto", cursor: "pointer" }}
          >
            <option value="created_at">Date Added</option>
            <option value="title">Title</option>
            <option value="rating">Rating</option>
          </select>

          {/* Sort Direction Toggle */}
          <button
            onClick={toggleSortOrder}
            title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
            className="btn btn-ghost btn-sm"
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
          aria-label="Loading books"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                <Skeleton className="skeleton-title" width="65%" />
                <Skeleton width="60px" height="20px" borderRadius="var(--radius-full)" />
              </div>
              <Skeleton className="skeleton-text" width="45%" style={{ marginBottom: "var(--space-6)" }} />
              <Skeleton height="6px" style={{ marginBottom: "var(--space-6)" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "auto" }}>
                <Skeleton width="50px" height="26px" borderRadius="var(--radius-sm)" />
                <Skeleton width="50px" height="26px" borderRadius="var(--radius-sm)" />
                <Skeleton width="50px" height="26px" borderRadius="var(--radius-sm)" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <ErrorBanner message={error} onRetry={loadBooks} />
      )}

      {/* Empty State */}
      {!loading && !error && paginatedData.items.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "var(--color-surface-raised)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--color-border-default)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-h3)", color: "var(--color-text-tertiary)", marginBottom: "0.5rem", fontWeight: 600 }}>
            No books found matching your criteria.
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)", marginBottom: "1.5rem" }}>
            Try adjusting your search terms or filters, or add your first book.
          </p>
          <button
            onClick={() => {
              setEditingBook(null);
              setIsFormOpen(true);
            }}
            className="btn btn-primary"
          >
            + Add First Book
          </button>
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
            className="design-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              padding: "var(--space-4) var(--space-6)",
            }}
          >
            <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-2xl)" }}>
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
                className="input-field"
                style={{ width: "auto", padding: "var(--space-1) var(--space-3)", fontSize: "var(--font-size-2xl)" }}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>

              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="btn btn-ghost btn-sm"
              >
                ← Previous
              </button>

              <button
                disabled={page >= paginatedData.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="btn btn-ghost btn-sm"
              >
                Next →
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
