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
      </div>
    </div>
  );
}
