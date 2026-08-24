"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Book, Collaborator, PaginatedResponse, ShelfDetail as IShelfDetail, ShelfRole } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { BookCard } from "@/features/books/components/BookCard";
import { useWebSocket } from "@/hooks/useWebSocket";

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

  const [actionLoading, setActionLoading] = useState(false);

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
    try {
      await fetchApi(`/api/v1/shelves/${shelfId}/collaborators/${userId}`, {
        method: "DELETE",
      });
      loadShelf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove collaborator.");
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
        return "#3b82f6"; // blue
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

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {isOwner && (
            <button
              onClick={() => setIsShareOpen((prev) => !prev)}
              style={{
                padding: "var(--space-3) var(--space-5)",
                background: "var(--color-surface-muted)",
                color: "var(--color-text-tertiary)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-2xl)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all var(--motion-fast)",
              }}
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
              style={{
                padding: "var(--space-3) var(--space-6)",
                background: "linear-gradient(135deg, #00c2ff 0%, #0070f3 100%)",
                color: "#000000",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-2xl)",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "var(--shadow-2)",
                transition: "all var(--motion-fast)",
              }}
            >
              + Add Book to Shelf
            </button>
          )}
        </div>
      </div>

      {/* Collaborators Management Panel (for OWNER) */}
      {isOwner && isShareOpen && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
            Shelf Collaborators & RBAC
          </h3>

          {/* Form to invite collaborator */}
          <form
            onSubmit={handleAddCollaborator}
            style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}
          >
            <input
              type="email"
              required
              placeholder="User email to invite..."
              value={collabEmail}
              onChange={(e) => setCollabEmail(e.target.value)}
              style={{
                flex: "1 1 200px",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
            <select
              value={collabRole}
              onChange={(e) => setCollabRole(e.target.value as ShelfRole)}
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            >
              <option value="VIEWER">Viewer (Read-only)</option>
              <option value="EDITOR">Editor (Add/Remove Books)</option>
            </select>
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                background: "var(--accent-color)",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Invite
            </button>
          </form>

          {/* Collaborator List */}
          {collaborators.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              No collaborators added to this shelf yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {collaborators.map((c) => (
                <div
                  key={c.userId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg-primary)",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</span>{" "}
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>({c.email})</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <select
                      value={c.role}
                      onChange={(e) => handleUpdateCollaboratorRole(c.userId, e.target.value as ShelfRole)}
                      style={{
                        padding: "0.3rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="VIEWER">VIEWER</option>
                      <option value="EDITOR">EDITOR</option>
                    </select>

                    <button
                      onClick={() => handleRemoveCollaborator(c.userId)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        borderRadius: "4px",
                        background: "#ef444420",
                        color: "var(--error-color)",
                        border: "1px solid #ef444440",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      Remove
                    </button>
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
              onEdit={() => {}} // No inline edit inside shelf view
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
                All available library books are already on this shelf!
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
