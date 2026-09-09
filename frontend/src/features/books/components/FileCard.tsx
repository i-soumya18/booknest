"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookFile } from "@/types";
import styles from "./FileCard.module.css";

interface FileCardProps {
  file: BookFile;
  bookId: string;
  canDelete?: boolean;
  onDelete?: () => Promise<void> | void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  bookId,
  canDelete = false,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const isPdf =
    file.mime_type === "application/pdf" ||
    file.mimeType === "application/pdf" ||
    (file.original_name || file.originalName || "").toLowerCase().endsWith(".pdf");

  const fileName = file.original_name || file.originalName || "Uploaded Book";
  const sizeBytes = file.file_size_bytes ?? file.fileSizeBytes;
  const pageCount = file.page_count ?? file.pageCount;

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm("Are you sure you want to remove this attached file?")) return;
    try {
      setIsDeleting(true);
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.card} role="region" aria-label={`Book file ${fileName}`}>
      <div className={styles.infoGroup}>
        <span
          className={`${styles.badge} ${isPdf ? styles.badgePdf : styles.badgeEpub}`}
          aria-label={isPdf ? "PDF document" : "EPUB ebook"}
        >
          {isPdf ? "PDF" : "EPUB"}
        </span>
        <div className={styles.details}>
          <span className={styles.fileName} title={fileName}>
            {fileName}
          </span>
          <span className={styles.meta}>
            {formatFileSize(sizeBytes)}
            {pageCount ? ` • ${pageCount} ${isPdf ? "pages" : "chapters"}` : ""}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Link
          href={`/read/${bookId}`}
          className={`${styles.actionButton} ${styles.readButton}`}
          title="Open in Reader"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Read</span>
        </Link>

        {canDelete && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`${styles.actionButton} ${styles.deleteButton}`}
            aria-label={`Delete ${fileName}`}
            title="Delete file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>{isDeleting ? "..." : "Remove"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
