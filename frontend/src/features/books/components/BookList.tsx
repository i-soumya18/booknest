"use client";

import { useEffect, useState, useCallback } from "react";
import { Book, BookSortBy, BookStatus, PaginatedResponse, SortOrder } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "./BookCard";
import { BookForm, BookFormData } from "./BookForm";
import { LendBookModal } from "@/features/lending";
import { Skeleton, SkeletonCard, ErrorBanner, useToast } from "@/components/ui";

export function BookList() {
  const { success, error: toastError } = useToast();
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [lendingBook, setLendingBook] = useState<Book | null>(null);
  const [isLendModalOpen, setIsLendModalOpen] = useState(false);


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
    try {
      if (editingBook) {
        await fetchApi<Book>(`/api/v1/books/${editingBook.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        success(`Updated "${formData.title}"`);
      } else {
        await fetchApi<Book>("/api/v1/books", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        success(`Added "${formData.title}" to library`);
      }
      setIsFormOpen(false);
      setEditingBook(null);
      loadBooks();
    } catch (err) {
      toastError("Save failed", err instanceof Error ? err.message : "Error saving book");
      throw err;
    }
  };

  const handleDelete = async (bookId: string) => {
    setError(null);
    try {
      await fetchApi(`/api/v1/books/${bookId}`, { method: "DELETE" });
      success("Book deleted from library");
      loadBooks();
    } catch (err) {
      toastError("Failed to delete book", err instanceof Error ? err.message : "Error");
      setError(err instanceof Error ? err.message : "Failed to delete book.");
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header & Primary Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div className="section-header" style={{ marginBottom: 0 }}>
          <h2>📚 My Book Library</h2>
          <p>Manage, filter, and track your personal collection with server-side pagination.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              if (paginatedData.items.length > 0) {
                setLendingBook(paginatedData.items[0]);
              } else {
                setIsLendModalOpen(true);
              }
            }}
            disabled={paginatedData.items.length === 0}
            className="btn btn-secondary"
            style={{ border: "1px solid rgba(56, 189, 248, 0.4)", color: "var(--color-accent-primary)" }}
          >
            <span>🤝</span> Lend a Book
          </button>
          <button
            onClick={() => {
              setEditingBook(null);
              setIsFormOpen(true);
            }}
            className="btn btn-primary"
          >
            <span>+</span> Add Book
          </button>
        </div>
      </div>


      {/* Filter, Search & View Controls Bar */}
      <div
        className="design-card"
        style={{
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search Input */}
          <div style={{ flex: "1 1 280px", position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Search by title or author..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field"
              style={{ paddingRight: search ? "32px" : "12px" }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Controls Right */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {/* Sort Field */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BookSortBy)}
              className="input-field"
              style={{ width: "auto", cursor: "pointer", fontSize: "13px", padding: "6px 10px" }}
            >
              <option value="created_at">Date Added</option>
              <option value="title">Title</option>
              <option value="rating">Rating</option>
            </select>

            {/* Sort Direction Toggle */}
            <button
              onClick={toggleSortOrder}
              title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "12px" }}
            >
              {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: "flex", background: "rgba(8,13,22,0.8)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-default)", padding: "2px" }}>
              <button
                onClick={() => setViewMode("grid")}
                className="btn btn-xs"
                style={{
                  background: viewMode === "grid" ? "rgba(56,189,248,0.2)" : "transparent",
                  color: viewMode === "grid" ? "#38bdf8" : "var(--color-text-muted)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 8px",
                }}
                title="Grid View"
              >
                🔲 Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="btn btn-xs"
                style={{
                  background: viewMode === "list" ? "rgba(56,189,248,0.2)" : "transparent",
                  color: viewMode === "list" ? "#38bdf8" : "var(--color-text-muted)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 8px",
                }}
                title="Dense List View"
              >
                📄 List
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 600 }}>Filter:</span>
          {[
            { id: "", label: "All Statuses" },
            { id: "WANT_TO_READ", label: "Want to Read" },
            { id: "READING", label: "Currently Reading" },
            { id: "FINISHED", label: "Finished" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setStatusFilter(chip.id as any);
                setPage(1);
              }}
              className="btn btn-xs"
              style={{
                background: statusFilter === chip.id ? "rgba(56, 189, 248, 0.15)" : "transparent",
                color: statusFilter === chip.id ? "#38bdf8" : "var(--color-text-secondary)",
                border: statusFilter === chip.id ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-full)",
                padding: "3px 10px",
                fontWeight: statusFilter === chip.id ? 700 : 500,
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton State */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
          aria-label="Loading books"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card" style={{ height: "260px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <Skeleton className="skeleton-title" width="65%" />
                <Skeleton width="60px" height="20px" borderRadius="var(--radius-full)" />
              </div>
              <Skeleton className="skeleton-text" width="45%" style={{ marginBottom: "20px" }} />
              <Skeleton height="6px" style={{ marginBottom: "20px" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "auto" }}>
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
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--color-border-default)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📖</div>
          <p style={{ fontSize: "18px", color: "#ffffff", marginBottom: "6px", fontWeight: 700 }}>
            No books found
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
            {search || statusFilter ? "Try adjusting your search terms or filters." : "Add your first book to start tracking your reading journey."}
          </p>
          <button
            onClick={() => {
              setEditingBook(null);
              setIsFormOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            + Add First Book
          </button>
        </div>
      )}

      {/* Success State */}
      {!loading && !error && paginatedData.items.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: "20px",
                marginBottom: "24px",
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
                  onLend={(b) => setLendingBook(b)}
                  onDelete={handleDelete}
                  onProgressUpdated={loadBooks}
                />
              ))}
            </div>
          ) : (
            /* Dense Table List View */
            <div className="design-card" style={{ overflowX: "auto", marginBottom: "24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                    <th style={{ padding: "12px 16px" }}>Book Title</th>
                    <th style={{ padding: "12px 16px" }}>Author</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px" }}>Progress</th>
                    <th style={{ padding: "12px 16px" }}>Rating</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.items.map((book) => {
                    const cp = book.current_page ?? book.currentPage ?? 0;
                    const tp = book.total_pages ?? book.totalPages ?? 1;
                    const pct = Math.round((cp / tp) * 100);
                    return (
                      <tr key={book.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "12px 16px", color: "#ffffff", fontWeight: 600 }}>{book.title}</td>
                        <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>{book.author}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`badge ${book.status === "FINISHED" ? "badge-finished" : book.status === "READING" ? "badge-reading" : "badge-want"}`}>
                            {book.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--color-text-primary)" }}>
                          {cp}/{tp} p. ({pct}%)
                        </td>
                        <td style={{ padding: "12px 16px", color: "#fbbf24" }}>
                          {book.rating ? "★".repeat(book.rating) : "-"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button
                            onClick={() => setLendingBook(book)}
                            className="btn btn-ghost btn-xs"
                            style={{ color: "var(--color-accent-primary)" }}
                          >
                            🤝 Lend
                          </button>
                          <button
                            onClick={() => {
                              setEditingBook(book);
                              setIsFormOpen(true);
                            }}
                            className="btn btn-ghost btn-xs"
                            style={{ marginLeft: "4px" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(book.id)}
                            className="btn btn-danger btn-xs"
                            style={{ marginLeft: "4px" }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}


          {/* Server-Side Pagination Footer */}
          <div
            className="design-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "12px 20px",
            }}
          >
            <div style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
              Showing {paginatedData.items.length} of {paginatedData.total} books (Page {paginatedData.page} of{" "}
              {paginatedData.totalPages})
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="input-field"
                style={{ width: "auto", padding: "4px 8px", fontSize: "12px" }}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>

              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="btn btn-secondary btn-xs"
              >
                ← Previous
              </button>

              <button
                disabled={page >= paginatedData.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="btn btn-secondary btn-xs"
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

      {/* Top-Level Lending Modal (outside book cards) */}
      {(lendingBook || isLendModalOpen) && (
        <LendBookModal
          book={lendingBook || paginatedData.items[0]}
          availableBooks={paginatedData.items}
          onClose={() => {
            setLendingBook(null);
            setIsLendModalOpen(false);
          }}
          onSuccess={loadBooks}
        />
      )}
    </div>
  );
}


