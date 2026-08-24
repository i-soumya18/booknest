"use client";

import Link from "next/link";
import { Shelf } from "@/types";

interface ShelfCardProps {
  shelf: Shelf;
  onEdit: (shelf: Shelf) => void;
  onDelete: (shelfId: string) => void;
}

export function ShelfCard({ shelf, onEdit, onDelete }: ShelfCardProps) {
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
            style={{
              padding: "var(--space-1) var(--space-3)",
              fontSize: "var(--font-size-xl)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-muted)",
              color: "var(--color-text-tertiary)",
              border: "1px solid var(--color-border-default)",
              cursor: "pointer",
              transition: "all var(--motion-fast)",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(shelf.id)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              fontSize: "var(--font-size-xl)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-error-bg)",
              color: "var(--color-error)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              cursor: "pointer",
              transition: "all var(--motion-fast)",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
