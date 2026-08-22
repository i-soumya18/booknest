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
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "1rem",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Link
            href={`/shelves/${shelf.id}`}
            style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            {shelf.name}
          </Link>
        </div>
        {shelf.description && (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              marginTop: "0.5rem",
              lineHeight: 1.4,
            }}
          >
            {shelf.description}
          </p>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link
          href={`/shelves/${shelf.id}`}
          style={{
            fontSize: "0.85rem",
            color: "var(--accent-color)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          View Books →
        </Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onEdit(shelf)}
            style={{
              padding: "0.35rem 0.7rem",
              fontSize: "0.8rem",
              borderRadius: "4px",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(shelf.id)}
            style={{
              padding: "0.35rem 0.7rem",
              fontSize: "0.8rem",
              borderRadius: "4px",
              background: "#ef444420",
              color: "var(--error-color)",
              border: "1px solid #ef444440",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
