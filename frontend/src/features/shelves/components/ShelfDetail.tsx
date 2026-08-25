"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Book, Collaborator, PaginatedResponse, ShelfDetail as IShelfDetail, ShelfRole } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "@/features/books/components/BookCard";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Spinner, Skeleton, SkeletonCard, ErrorBanner } from "@/components/ui";

interface ShelfDetailProps {
  shelfId: string;
}

export function ShelfDetailView({ shelfId }: ShelfDetailProps) {
  const [shelfDetail, setShelfDetail] = useState<IShelfDetail | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");

  const [collabEmail, setCollabEmail] = useState("");
  const [collabRole, setCollabRole] = useState<ShelfRole>("VIEWER");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmRemoveCollabId, setConfirmRemoveCollabId] = useState<string | null>(null);
  const [removingCollabId, setRemovingCollabId] = useState<string | null>(null);

  const loadShelf = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<IShelfDetail>(`/api/v1/shelves/${shelfId}`);
      setShelfDetail(data);

      const collabs = await fetchApi<Collaborator[]>(`/api/v1/shelves/${shelfId}/collaborators`);
      setCollaborators(collabs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shelf details.");
    } finally {
      setLoading(false);
    }
  }, [shelfId]);

  useWebSocket(
    useCallback(
      (event: any) => {
        if (event.shelf_id === shelfId) {
          loadShelf();
        }
      },
      [shelfId, loadShelf]
    )
  );

  const loadAvailableBooks = useCallback(async () => {
    try {
      const res = await fetchApi<PaginatedResponse<Book>>("/api/v1/books?page_size=100");
      setAvailableBooks(res.items);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadShelf();
  }, [loadShelf]);

  const handleAddBook = async () => {
    if (!selectedBookId) return;
    setError(null);
    setActionLoading(true);
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/books/${selectedBookId}`, {
        method: "POST",
      });
      setIsAddBookOpen(false);
      setSelectedBookId("");
      loadShelf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add book to shelf.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    setError(null);
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/books/${bookId}`, {
        method: "DELETE",
      });
      loadShelf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove book from shelf.");
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabEmail.trim()) return;
    setError(null);
    setActionLoading(true);

    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/collaborators`, {
        method: "POST",
        body: JSON.stringify({ email: collabEmail.trim(), role: collabRole }),
      });
      setCollabEmail("");
      loadShelf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add collaborator.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCollaboratorRole = async (userId: string, newRole: ShelfRole) => {
    setError(null);
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/collaborators/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      loadShelf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    setError(null);
    setRemovingCollabId(userId);
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/collaborators/${userId}`, {
        method: "DELETE",
      });
      loadShelf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove collaborator.");
    } finally {
      setRemovingCollabId(null);
      setConfirmRemoveCollabId(null);
    }
  };

  // SKELETON LOADING STATE
  if (loading) {
    return (
      <div style={{ padding: "var(--space-6) 0" }} aria-busy="true">
        <Skeleton width="120px" height="18px" style={{ marginBottom: "var(--space-6)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)", flexWrap: "wrap", gap: "var(--space-4)" }}>
          <div>
            <Skeleton className="skeleton-title" width="280px" style={{ marginBottom: "var(--space-3)" }} />
            <Skeleton className="skeleton-text" width="340px" />
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Skeleton width="180px" height="38px" borderRadius="var(--radius-md)" />
            <Skeleton width="160px" height="38px" borderRadius="var(--radius-md)" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card" style={{ minHeight: "220px" }}>
              <Skeleton className="skeleton-title" width="70%" style={{ marginBottom: "var(--space-4)" }} />
              <Skeleton className="skeleton-text" width="50%" style={{ marginBottom: "var(--space-6)" }} />
              <Skeleton height="6px" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error && !shelfDetail) {
    return (
      <div style={{ padding: "var(--space-6) 0" }}>
        <Link href="/shelves" style={{ color: "var(--color-accent-primary)", textDecoration: "none", fontSize: "var(--font-size-2xl)", fontWeight: 600, display: "inline-block", marginBottom: "var(--space-4)" }}>
          ← Back to Shelves
        </Link>
        <ErrorBanner message={error || "Shelf not found."} onRetry={loadShelf} />
      </div>
    );
  }

  if (!shelfDetail) return null;

  const userRole = shelfDetail.userRole || "OWNER";
  const canEditBooks = userRole === "OWNER" || userRole === "EDITOR";
  const isOwner = userRole === "OWNER";

  const booksNotOnShelf = availableBooks.filter(
    (b) => !shelfDetail.books.some((sb) => sb.id === b.id)
  );

  const getRoleBadgeColor = (role: ShelfRole) => {
    switch (role) {
      case "OWNER":
        return "#8b5cf6"; // purple
      case "EDITOR":
        return "#00c2ff"; // cyan
      case "VIEWER":
      default:
        return "#10b981"; // green
    }
  };

  return (
    <div style={{ padding: "var(--space-6) 0" }}>
      <Link href="/shelves" style={{ color: "var(--color-accent-primary)", textDecoration: "none", fontSize: "var(--font-size-2xl)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        ← Back to Shelves
      </Link>

      {error && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <ErrorBanner message={error} onRetry={loadShelf} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          margin: "var(--space-4) 0 var(--space-8) 0",
          flexWrap: "wrap",
          gap: "var(--space-6)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "var(--font-size-h1)", color: "var(--color-text-tertiary)", fontWeight: "700", letterSpacing: "-0.02em" }}>
              📁 {shelfDetail.name}
            </h2>
            <span
              style={{
                fontSize: "var(--font-size-lg)",
                fontWeight: 700,
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-full)",
                background: `${getRoleBadgeColor(userRole)}18`,
                color: getRoleBadgeColor(userRole),
                border: `1px solid ${getRoleBadgeColor(userRole)}50`,
                letterSpacing: "0.02em",
              }}
            >
              Role: {userRole}
            </span>
          </div>
          {shelfDetail.description && (
            <p style={{ color: "var(--color-text-primary)", marginTop: "var(--space-2)", fontSize: "var(--font-size-3xl)" }}>
              {shelfDetail.description}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {isOwner && (
            <button
              onClick={() => setIsShareOpen((prev) => !prev)}
              className="btn btn-secondary"
            >
              👥 Manage Collaborators
            </button>
          )}

          {canEditBooks && (
            <button
              onClick={() => {
                loadAvailableBooks();
                setIsAddBookOpen(true);
              }}
              className="btn btn-primary"
            >
              + Add Book to Shelf
            </button>
          )}
        </div>
      </div>

      {/* Collaborators Management Panel (for OWNER) */}
      {isOwner && isShareOpen && (
        <div
          className="design-card"
          style={{
            padding: "var(--space-6)",
            marginBottom: "var(--space-8)",
          }}
        >
          <h3 style={{ fontSize: "var(--font-size-h3)", marginBottom: "var(--space-4)", color: "var(--color-text-tertiary)", fontWeight: 600 }}>
            Shelf Collaborators & RBAC
          </h3>

          {/* Form to invite collaborator */}
          <form
            onSubmit={handleAddCollaborator}
            style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}
          >
            <input
              type="email"
              required
              placeholder="User email to invite..."
              value={collabEmail}
              onChange={(e) => setCollabEmail(e.target.value)}
              className="input-field"
              style={{ flex: "1 1 240px" }}
            />
            <select
              value={collabRole}
              onChange={(e) => setCollabRole(e.target.value as ShelfRole)}
              className="input-field"
              style={{ width: "auto", cursor: "pointer" }}
            >
              <option value="VIEWER">Viewer (Read-only)</option>
              <option value="EDITOR">Editor (Add/Remove Books)</option>
            </select>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn btn-primary"
            >
              {actionLoading ? <Spinner /> : null}
              {actionLoading ? "Inviting..." : "Invite"}
            </button>
          </form>

          {/* Collaborator List */}
          {collaborators.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)" }}>
              No collaborators added to this shelf yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {collaborators.map((c) => (
                <div
                  key={c.userId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-surface-base)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border-default)",
                    flexWrap: "wrap",
                    gap: "var(--space-3)",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--color-text-tertiary)", fontSize: "var(--font-size-2xl)" }}>{c.name}</span>{" "}
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xl)" }}>({c.email})</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <select
                      value={c.role}
                      onChange={(e) => handleUpdateCollaboratorRole(c.userId, e.target.value as ShelfRole)}
                      className="input-field"
                      style={{ width: "auto", padding: "var(--space-1) var(--space-3)", fontSize: "var(--font-size-xl)" }}
                    >
                      <option value="VIEWER">VIEWER</option>
                      <option value="EDITOR">EDITOR</option>
                    </select>

                    {confirmRemoveCollabId === c.userId ? (
                      <div style={{ display: "flex", gap: "var(--space-1)" }}>
                        <button
                          onClick={() => handleRemoveCollaborator(c.userId)}
                          disabled={removingCollabId === c.userId}
                          className="btn btn-danger btn-sm"
                        >
                          {removingCollabId === c.userId ? <Spinner /> : null}
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRemoveCollabId(null)}
                          className="btn btn-ghost btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveCollabId(c.userId)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Books Grid */}
      {shelfDetail.books.length === 0 ? (
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
            This shelf is empty.
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-3xl)" }}>
            {canEditBooks
              ? "Add books from your library to keep them organized on this shelf."
              : "No books have been added to this shared shelf yet."}
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
              onEdit={() => {}}
              onDelete={canEditBooks ? handleRemoveBook : () => setError("Viewers cannot remove books.")}
            />
          ))}
        </div>
      )}

      {/* Modal to add existing book */}
      {isAddBookOpen && canEditBooks && (
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
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddBookOpen(false);
          }}
        >
          <div
            className="design-card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "var(--space-8)",
              boxShadow: "var(--shadow-3)",
            }}
          >
            <h3 style={{ fontSize: "var(--font-size-h2)", marginBottom: "var(--space-4)", color: "var(--color-text-tertiary)", fontWeight: 700 }}>
              Add Book to {shelfDetail.name}
            </h3>

            {booksNotOnShelf.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", fontSize: "var(--font-size-3xl)" }}>
                All available library books are already on this shelf!
              </p>
            ) : (
              <div style={{ marginBottom: "var(--space-6)" }}>
                <label className="form-label">
                  Select Book
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="input-field"
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

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
              <button
                type="button"
                onClick={() => setIsAddBookOpen(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBookId || actionLoading}
                onClick={handleAddBook}
                className="btn btn-primary"
              >
                {actionLoading ? <Spinner /> : null}
                {actionLoading ? "Adding..." : "Add Book"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
