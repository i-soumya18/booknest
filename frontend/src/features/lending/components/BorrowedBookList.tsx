"use client";

import { useCallback, useEffect, useState } from "react";
import { BorrowedBook, PaginatedResponse } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getBorrowedBooks } from "../api";
import { Skeleton, SkeletonCard, ErrorBanner, useToast } from "@/components/ui";

export function BorrowedBookList() {
  const { toast } = useToast();
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
          toast({
            title: "⚡ Lending Status Updated",
            description: `Event: ${event.event_type}`,
            type: "info",
          });
        }
      },
      [fetchBooks, toast]
    )
  );

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header */}
      <div
        className="design-card"
        style={{
          padding: "24px 28px",
          marginBottom: "24px",
          background: "linear-gradient(135deg, rgba(17, 29, 51, 0.9) 0%, rgba(13, 21, 36, 0.95) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px" }}>🤝</span>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
            Borrowed Books
          </h1>
          <span className="badge badge-lent">Read-Only View</span>
        </div>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", marginBottom: "14px" }}>
          Books lent to your account by other users. You have read-only visibility into book pages and notes while ownership remains with the lender.
        </p>

        {/* Architectural Concurrency Callout */}
        <div
          className="glass-panel"
          style={{
            padding: "10px 14px",
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            borderLeft: "3px solid #38bdf8",
          }}
        >
          <strong style={{ color: "#38bdf8" }}>🔒 Concurrency & Integrity:</strong> Books cannot be double-lent under concurrent requests. The PostgreSQL partial index <code>UNIQUE(book_id) WHERE returned_at IS NULL</code> guarantees single active borrower state.
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "20px" }}>
          <ErrorBanner message={error} onRetry={fetchBooks} />
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
            marginBottom: "28px",
          }}
          aria-busy="true"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card" style={{ height: "200px", padding: "20px" }}>
              <Skeleton className="skeleton-title" width="70%" style={{ marginBottom: "8px" }} />
              <Skeleton className="skeleton-text" width="50%" style={{ marginBottom: "20px" }} />
              <Skeleton height="36px" style={{ marginBottom: "14px" }} />
              <Skeleton height="6px" />
            </SkeletonCard>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!data || data.items.length === 0) && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "var(--color-surface-raised)",
            border: "1px dashed var(--color-border-default)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🤝</div>
          <p style={{ fontSize: "18px", color: "#ffffff", marginBottom: "6px", fontWeight: 700 }}>
            No borrowed books active
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
            When another user lends you a book from their library, it will stream here in real time via authenticated WebSockets.
          </p>
        </div>
      )}

      {/* Success State */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
              gap: "20px",
              marginBottom: "28px",
            }}
          >
            {data.items.map((item) => {
              const book = item.book;
              const currentPage = book.current_page ?? book.currentPage ?? 0;
              const totalPages = book.total_pages ?? book.totalPages ?? 1;
              const rawPercent = Math.min(100, (currentPage / (totalPages || 1)) * 100);
              const progressPercent = Number.isInteger(rawPercent)
                ? rawPercent.toString()
                : (Math.round(rawPercent * 10) / 10).toFixed(1);

              return (
                <div
                  key={item.lendingId}
                  className="design-card"
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "17px", color: "#ffffff", fontWeight: 700, marginBottom: "4px" }}>
                        {book.title}
                      </h3>
                      <p style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>by {book.author}</p>
                    </div>
                    <span className="badge badge-lent">Borrowed</span>
                  </div>

                  {/* Owner Info */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <span>Lent by: <strong style={{ color: "#ffffff" }}>{item.ownerName}</strong> ({item.ownerEmail})</span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                        marginBottom: "6px",
                      }}
                    >
                      <span>Reading Progress</span>
                      <span style={{ color: "#ffffff", fontWeight: 600 }}>
                        {currentPage} / {totalPages} pages ({progressPercent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "6px",
                        background: "rgba(255, 255, 255, 0.08)",
                        borderRadius: "var(--radius-full)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPercent}%`,
                          height: "100%",
                          background: "#38bdf8",
                          transition: "width var(--motion-normal)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Read Only Notice */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "6px",
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>🔒 Scoped read-only access (Borrower permission)</span>
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
                gap: "12px",
                padding: "12px 20px",
              }}
            >
              <div style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
                Page <strong style={{ color: "#ffffff" }}>{page}</strong> of <strong style={{ color: "#ffffff" }}>{data.totalPages}</strong>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-secondary btn-xs"
                >
                  ← Previous
                </button>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-secondary btn-xs"
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

