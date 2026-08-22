"use client";

import { useCallback, useEffect, useState } from "react";
import { BorrowedBook, PaginatedResponse } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getBorrowedBooks } from "../api";

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
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            🤝 Borrowed Books
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Books lent to you by other users. Borrowed books are read-only.
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#ef444415",
            border: "1px solid #ef444440",
            color: "var(--error-color)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={fetchBooks}
            style={{
              padding: "0.35rem 0.75rem",
              background: "var(--error-color)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          Loading borrowed books...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--bg-surface)",
            border: "1px dashed var(--border-color)",
            borderRadius: "8px",
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No borrowed books found</p>
          <p style={{ fontSize: "0.875rem" }}>When someone lends you a book, it will appear here.</p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
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
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    position: "relative",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                        {book.title}
                      </h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>by {book.author}</p>
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        background: "#3b82f620",
                        color: "#3b82f6",
                        border: "1px solid #3b82f640",
                      }}
                    >
                      Borrowed
                    </span>
                  </div>

                  {/* Owner Info */}
                  <div
                    style={{
                      background: "var(--bg-primary)",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Lent by: <strong>{item.ownerName}</strong> ({item.ownerEmail})</span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Progress</span>
                      <span>
                        {book.currentPage} / {book.totalPages} pages ({progressPercent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "6px",
                        background: "var(--bg-card)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPercent}%`,
                          height: "100%",
                          background: "#3b82f6",
                        }}
                      />
                    </div>
                  </div>

                  {/* Read Only Notice */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "0.5rem",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
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
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", alignItems: "center" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Page {page} of {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
