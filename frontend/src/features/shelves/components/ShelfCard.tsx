"use client";

import { useState } from "react";
import Link from "next/link";
import { Shelf } from "@/types";
import { Spinner, useToast } from "@/components/ui";

interface ShelfCardProps {
  shelf: Shelf;
  onEdit: (shelf: Shelf) => void;
  onDelete: (shelfId: string) => Promise<void> | void;
}

export function ShelfCard({ shelf, onEdit, onDelete }: ShelfCardProps) {
  const { success, error: toastError } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userRole = shelf.userRole || (shelf as any).user_role || "OWNER";
  const isOwner = userRole === "OWNER";

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return <span className="badge badge-owner">Owner 👑</span>;
      case "EDITOR":
        return <span className="badge badge-editor">Editor ✏️</span>;
      case "VIEWER":
      default:
        return <span className="badge badge-viewer">Viewer 👁️</span>;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(shelf.id);
      success(`Deleted shelf "${shelf.name}"`);
    } catch (err) {
      toastError("Failed to delete shelf", err instanceof Error ? err.message : "Error");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="design-card"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "16px",
        background: "linear-gradient(180deg, #111d33 0%, #0d1524 100%)",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <Link
            href={`/shelves/${shelf.id}`}
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            📁 {shelf.name}
          </Link>
          {getRoleBadge(userRole)}
        </div>

        {shelf.description && (
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              marginTop: "8px",
              lineHeight: 1.5,
            }}
          >
            {shelf.description}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: "12px",
          marginTop: "auto",
        }}
      >
        <Link
          href={`/shelves/${shelf.id}`}
          className="btn btn-ghost btn-xs"
          style={{
            color: "var(--color-accent-primary)",
            fontWeight: 600,
            paddingLeft: 0,
          }}
        >
          View Shelf & Books →
        </Link>

        {isOwner && (
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => onEdit(shelf)}
              className="btn btn-secondary btn-xs"
            >
              Edit
            </button>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-danger btn-xs"
                >
                  {deleting ? <Spinner /> : "Confirm?"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn btn-ghost btn-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-danger btn-xs"
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

