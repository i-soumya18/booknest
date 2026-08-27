"use client";

import { useState } from "react";
import Link from "next/link";
import { Shelf } from "@/types";
import { Spinner } from "@/components/ui";

interface ShelfCardProps {
  shelf: Shelf;
  onEdit: (shelf: Shelf) => void;
  onDelete: (shelfId: string) => Promise<void> | void;
}

export function ShelfCard({ shelf, onEdit, onDelete }: ShelfCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userRole = shelf.userRole || (shelf as any).user_role || "OWNER";
  const isOwner = userRole === "OWNER";

  const getRoleBadgeColor = (role: string) => {
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(shelf.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="design-card"
      style={{
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "var(--space-5)",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
          <Link
            href={`/shelves/${shelf.id}`}
            style={{
              fontSize: "var(--font-size-h3)",
              fontWeight: 700,
              color: "var(--color-text-tertiary)",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            📁 {shelf.name}
          </Link>
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              background: `${getRoleBadgeColor(userRole)}18`,
              color: getRoleBadgeColor(userRole),
              border: `1px solid ${getRoleBadgeColor(userRole)}50`,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {userRole}
          </span>
        </div>
        {shelf.description && (
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-2xl)",
              marginTop: "var(--space-2)",
              lineHeight: 1.5,
            }}
          >
            {shelf.description}
          </p>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border-muted)", paddingTop: "var(--space-4)" }}>
        <Link
          href={`/shelves/${shelf.id}`}
          style={{
            fontSize: "var(--font-size-2xl)",
            color: "var(--color-accent-primary)",
            textDecoration: "none",
            fontWeight: 600,
            transition: "all var(--motion-fast)",
          }}
        >
          View Shelf & Books →
        </Link>
        {isOwner && (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              onClick={() => onEdit(shelf)}
              className="btn btn-secondary btn-sm"
            >
              Edit
            </button>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-danger btn-sm"
                >
                  {deleting ? <Spinner /> : null}
                  {deleting ? "Deleting..." : "Confirm?"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-danger btn-sm"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
