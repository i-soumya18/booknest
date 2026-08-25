"use client";

import { useCallback, useEffect, useState } from "react";
import { BorrowedBook, PaginatedResponse } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getBorrowedBooks } from "../api";
import { Skeleton, SkeletonCard, ErrorBanner } from "@/components/ui";

export function BorrowedBookList() {
  const [data, setData] = useState<PaginatedResponse<BorrowedBook> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBorrowedBooks(page, 12);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load borrowed books.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useWebSocket(
    useCallback(
      (event: any) => {
        if (event.event_type === "BOOK_LENT" || event.event_type === "BOOK_RETURNED") {
          fetchBooks();
        }
      },
      [fetchBooks]
    )
  );

  return (
    <div style={{ padding: "var(--space-6) 0" }}>
      <div className="section-header">
        <h1>🤝 Borrowed Books</h1>
        <p>Books lent to you by other users. Borrowed books are read-only.</p>
      </div>

      {error && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <ErrorBanner message={error} onRetry={fetchBooks} />
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "var(--space-6)",
            marginBottom: "var(--space-8)",
          }}
          aria-busy="true"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card" style={{ minHeight: "200px", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <Skeleton className="skeleton-title" width="70%" style={{ marginBottom: "var(--space-2)" }} />
                  <Skeleton className="skeleton-text" width="50%" />
                </div>
                <Skeleton width="64px" height="22px" borderRadius="var(--radius-sm)" />
              </div>
              <Skeleton height="36px" borderRadius="var(--radius-sm)" />
              <div>
                <Skeleton className="skeleton-text" width="100%" style={{ marginBottom: "var(--space-2)" }} />
                <Skeleton height="6px" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!data || data.items.length === 0) && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--color-surface-raised)",
            border: "1px dashed var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-secondary)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-h3)", color: "var(--color-text-tertiary)", marginBottom: "var(--space-2)", fontWeight: 600 }}>
            No borrowed books found
          </p>
          <p style={{ fontSize: "var(--font-size-3xl)" }}>
            When someone lends you a book, it will appear here in real-time.
          </p>
        </div>
      )}

      {/* Success State */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "var(--space-6)",
              marginBottom: "var(--space-8)",
            }}
          >
            {data.items.map((item) => {
              const book = item.book;
              const progressPercent = Math.min(
                100,
                Math.round((book.currentPage / (book.totalPages || 1)) * 100)
              );

              return (
                <div
                  key={item.lendingId}
                  className="design-card"
                  style={{
                    padding: "var(--space-6)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-4)",
                    position: "relative",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "var(--font-size-h3)", color: "var(--color-text-tertiary)", fontWeight: 600, marginBottom: "var(--space-1)" }}>
                        {book.title}
                      </h3>
                      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-2xl)" }}>by {book.author}</p>
                    </div>
                    <span
                      style={{
                        fontSize: "var(--font-size-lg)",
                        fontWeight: 700,
                        padding: "var(--space-1) var(--space-3)",
                        borderRadius: "var(--radius-full)",
                        background: "rgba(0, 194, 255, 0.12)",
                        color: "var(--color-accent-primary)",
                        border: "1px solid rgba(0, 194, 255, 0.35)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Borrowed
                    </span>
                  </div>

                  {/* Owner Info */}
                  <div
                    style={{
                      background: "var(--color-surface-base)",
                      padding: "var(--space-3) var(--space-4)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--font-size-2xl)",
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-border-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Lent by: <strong style={{ color: "var(--color-text-tertiary)" }}>{item.ownerName}</strong> ({item.ownerEmail})</span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "var(--font-size-2xl)",
                        color: "var(--color-text-primary)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      <span>Progress</span>
                      <span style={{ color: "var(--color-text-tertiary)", fontWeight: 500 }}>
                        {book.currentPage} / {book.totalPages} pages ({progressPercent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "6px",
                        background: "var(--color-surface-muted)",
                        borderRadius: "var(--radius-full)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPercent}%`,
                          height: "100%",
                          background: "var(--color-accent-primary)",
                          transition: "width var(--motion-normal)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Read Only Notice */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "var(--space-2)",
                      fontSize: "var(--font-size-xl)",
                      color: "var(--color-text-secondary)",
                      fontStyle: "italic",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    <span>🔒 Read-only view</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
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
                Page <strong style={{ color: "var(--color-text-tertiary)" }}>{page}</strong> of <strong style={{ color: "var(--color-text-tertiary)" }}>{data.totalPages}</strong>
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-ghost btn-sm"
                >
                  ← Previous
                </button>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-ghost btn-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
