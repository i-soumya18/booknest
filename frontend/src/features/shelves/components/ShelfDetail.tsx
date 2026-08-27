"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Book, Collaborator, PaginatedResponse, ShelfDetail as IShelfDetail, ShelfRole } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "@/features/books/components/BookCard";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Spinner, Skeleton, SkeletonCard, ErrorBanner, useToast } from "@/components/ui";

interface ShelfDetailProps {
  shelfId: string;
}

export function ShelfDetailView({ shelfId }: ShelfDetailProps) {
  const { success, error: toastError } = useToast();
  const [shelfDetail, setShelfDetail] = useState<IShelfDetail | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [bookSearch, setBookSearch] = useState<string>("");

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
        if (event.shelf_id === shelfId || event.shelfId === shelfId) {
          loadShelf();
          success("Shelf updated live via WebSocket room!");
        }
      },
      [shelfId, loadShelf, success]
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

  const handleAddBook = async (bookIdToAdd?: string) => {
    const id = bookIdToAdd || selectedBookId;
    if (!id) return;
    setError(null);
    setActionLoading(true);
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/books/${id}`, {
        method: "POST",
      });
      success("Book added to shelf", "WebSocket event broadcast to shelf room.");
      setIsAddBookOpen(false);
      setSelectedBookId("");
      loadShelf();
    } catch (err) {
      toastError("Failed to add book", err instanceof Error ? err.message : "RBAC or network error");
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
      success("Book removed from shelf");
      loadShelf();
    } catch (err) {
      toastError("Failed to remove book", err instanceof Error ? err.message : "RBAC error");
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
      success(`Invited ${collabEmail} as ${collabRole}`);
      setCollabEmail("");
      loadShelf();
    } catch (err) {
      toastError("Failed to add collaborator", err instanceof Error ? err.message : "Error");
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
      success(`Updated collaborator role to ${newRole}`);
      loadShelf();
    } catch (err) {
      toastError("Failed to update role", err instanceof Error ? err.message : "Error");
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    setError(null);
    setRemovingCollabId(userId);
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/collaborators/${userId}`, {
        method: "DELETE",
      });
      success("Collaborator removed");
      loadShelf();
    } catch (err) {
      toastError("Failed to remove collaborator", err instanceof Error ? err.message : "Error");
    } finally {
      setRemovingCollabId(null);
      setConfirmRemoveCollabId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "16px 0" }} aria-busy="true">
        <Skeleton width="120px" height="18px" style={{ marginBottom: "16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <Skeleton className="skeleton-title" width="280px" style={{ marginBottom: "8px" }} />
            <Skeleton className="skeleton-text" width="340px" />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Skeleton width="160px" height="36px" borderRadius="var(--radius-md)" />
            <Skeleton width="140px" height="36px" borderRadius="var(--radius-md)" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="design-card" style={{ height: "220px" }}>
              <Skeleton className="skeleton-title" width="70%" style={{ marginBottom: "12px" }} />
              <Skeleton className="skeleton-text" width="50%" style={{ marginBottom: "20px" }} />
              <Skeleton height="6px" />
            </SkeletonCard>
          ))}
        </div>
      </div>

    );
  }

  if (error && !shelfDetail) {
    return (
      <div style={{ padding: "16px 0" }}>
        <Link href="/shelves" className="btn btn-ghost btn-xs" style={{ marginBottom: "16px" }}>
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

  const filteredAvailableBooks = booksNotOnShelf.filter(
    (b) =>
      b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.author.toLowerCase().includes(bookSearch.toLowerCase())
  );

  const getRoleExplanation = (role: ShelfRole) => {
    switch (role) {
      case "OWNER":
        return "👑 Full Control: You can rename/delete this shelf, invite/remove collaborators, and add/remove books.";
      case "EDITOR":
        return "✏️ Editor Permissions: You can add and remove books from this shelf. (Shelf settings and collaborators are managed by the Owner).";
      case "VIEWER":
      default:
        return "👁️ Viewer Permissions: You have read-only access to browse books on this shared shelf.";
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <Link href="/shelves" className="btn btn-ghost btn-xs" style={{ color: "var(--color-accent-primary)", marginBottom: "16px", paddingLeft: 0 }}>
        ← Back to Shelves
      </Link>

      {error && (
        <div style={{ marginBottom: "16px" }}>
          <ErrorBanner message={error} onRetry={loadShelf} />
        </div>
      )}

      {/* Header & Role Controls */}
      <div
        className="design-card"
        style={{
          padding: "24px 28px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          background: "linear-gradient(135deg, rgba(17, 29, 51, 0.9) 0%, rgba(13, 21, 36, 0.95) 100%)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "24px", color: "#ffffff", fontWeight: 800, letterSpacing: "-0.02em" }}>
              📁 {shelfDetail.name}
            </h1>
            <span
              className={`badge ${userRole === "OWNER" ? "badge-owner" : userRole === "EDITOR" ? "badge-editor" : "badge-viewer"}`}
            >
              Role: {userRole}
            </span>
          </div>

          {shelfDetail.description && (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", marginBottom: "10px" }}>
              {shelfDetail.description}
            </p>
          )}

          {/* RBAC Explanation Banner */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--color-border-subtle)",
              fontSize: "12px",
              color: "var(--color-text-secondary)",
            }}
          >
            <span>🛡️</span>
            <span>{getRoleExplanation(userRole)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {isOwner && (
            <button
              onClick={() => setIsShareOpen((prev) => !prev)}
              className="btn btn-secondary btn-sm"
            >
              👥 Manage Collaborators ({collaborators.length})
            </button>
          )}

          {canEditBooks ? (
            <button
              onClick={() => {
                loadAvailableBooks();
                setIsAddBookOpen(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <span>+</span> Add Book to Shelf
            </button>
          ) : (
            <span
              className="btn btn-ghost btn-sm"
              style={{ border: "1px dashed var(--color-border-default)", opacity: 0.7, cursor: "not-allowed" }}
              title="Viewers have read-only access enforced by FastAPI RBAC"
            >
              🔒 View-only access
            </span>
          )}
        </div>
      </div>

      {/* Collaborators Management Panel (for OWNER) */}
      {isOwner && isShareOpen && (
        <div
          className="design-card"
          style={{
            padding: "24px",
            marginBottom: "24px",
            background: "#0c1527",
            border: "1px solid rgba(56, 189, 248, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", color: "#ffffff", fontWeight: 700 }}>
              👥 Shelf Collaborators & RBAC Control
            </h3>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Enforced by backend RBAC router</span>
          </div>

          {/* Form to invite collaborator */}
          <form
            onSubmit={handleAddCollaborator}
            style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}
          >
            <input
              type="email"
              required
              placeholder="Enter user email (e.g. bob@example.com)..."
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
            <button type="submit" disabled={actionLoading} className="btn btn-primary btn-sm">
              {actionLoading ? <Spinner /> : "Invite Collaborator"}
            </button>
          </form>

          {/* Quick Demo Recipient Suggestions */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Quick Demo Invites:</span>
            <button
              type="button"
              onClick={() => {
                setCollabEmail("bob@example.com");
                setCollabRole("EDITOR");
              }}
              className="btn btn-secondary btn-xs"
            >
              ✏️ Bob (as Editor)
            </button>
            <button
              type="button"
              onClick={() => {
                setCollabEmail("charlie@example.com");
                setCollabRole("VIEWER");
              }}
              className="btn btn-secondary btn-xs"
            >
              👁️ Charlie (as Viewer)
            </button>
          </div>

          {/* Collaborator List */}
          {collaborators.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
              No collaborators added to this shelf yet. Invite other registered users to share collection access.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {collaborators.map((c) => {
                const collabUserId = (c.user_id || c.userId || c.email) as string;
                return (
                  <div
                    key={collabUserId}
                    className="glass-panel"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, color: "#ffffff", fontSize: "13px" }}>{c.name}</span>
                      <span style={{ color: "var(--color-text-secondary)", fontSize: "12px" }}>({c.email})</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <select
                        value={c.role}
                        onChange={(e) => handleUpdateCollaboratorRole(collabUserId, e.target.value as ShelfRole)}
                        className="input-field"
                        style={{ width: "auto", padding: "3px 8px", fontSize: "12px" }}
                      >
                        <option value="VIEWER">VIEWER</option>
                        <option value="EDITOR">EDITOR</option>
                      </select>

                      {confirmRemoveCollabId === collabUserId ? (
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => handleRemoveCollaborator(collabUserId)}
                            disabled={removingCollabId === collabUserId}
                            className="btn btn-danger btn-xs"
                          >
                            {removingCollabId === collabUserId ? <Spinner /> : "Confirm"}
                          </button>
                          <button onClick={() => setConfirmRemoveCollabId(null)} className="btn btn-ghost btn-xs">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemoveCollabId(collabUserId)} className="btn btn-danger btn-xs">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--color-border-default)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📂</div>
          <p style={{ fontSize: "18px", color: "#ffffff", marginBottom: "6px", fontWeight: 700 }}>
            This shelf is empty
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
            {canEditBooks
              ? "Add books from your library to organize and share this collection."
              : "No books have been added to this shared shelf yet."}
          </p>
          {canEditBooks && (
            <button
              onClick={() => {
                loadAvailableBooks();
                setIsAddBookOpen(true);
              }}
              className="btn btn-primary btn-sm"
            >
              + Add First Book
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: "20px",
          }}
        >
          {shelfDetail.books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => {}}
              onDelete={canEditBooks ? handleRemoveBook : () => toastError("Forbidden", "Viewers cannot remove books.")}
            />
          ))}
        </div>
      )}

      {/* Visual Add Book to Shelf Modal */}
      {isAddBookOpen && canEditBooks && (
        <div className="modal-backdrop" onClick={() => setIsAddBookOpen(false)}>
          <div className="modal-content" style={{ padding: "24px", maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>
                Add Books to &quot;{shelfDetail.name}&quot;
              </h3>
              <button onClick={() => setIsAddBookOpen(false)} className="btn btn-ghost btn-xs">✕</button>
            </div>

            {booksNotOnShelf.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", padding: "20px 0", textAlign: "center" }}>
                All available library books are already on this shelf!
              </p>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="🔍 Search available books by title or author..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="input-field"
                  style={{ marginBottom: "14px" }}
                />

                <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredAvailableBooks.map((b) => (
                    <div
                      key={b.id}
                      className="glass-panel"
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>{b.title}</div>
                        <div style={{ color: "var(--color-text-secondary)", fontSize: "12px" }}>by {b.author}</div>
                      </div>
                      <button
                        onClick={() => handleAddBook(b.id)}
                        disabled={actionLoading}
                        className="btn btn-primary btn-xs"
                      >
                        + Add to Shelf
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button onClick={() => setIsAddBookOpen(false)} className="btn btn-ghost btn-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

