"use client";

import React, { useRef, useState } from "react";
import { UploadProgress } from "./UploadProgress";
import styles from "./FileDropzone.module.css";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadFileName?: string;
  error?: string | null;
  disabled?: boolean;
  maxSizeMB?: number;
}

const ALLOWED_EXTENSIONS = [".pdf", ".epub"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/epub+zip",
];

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  uploadFileName,
  error,
  disabled = false,
  maxSizeMB = 100,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (file: File) => {
    setClientError(null);

    // 1. Check extension & MIME
    const name = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type) || !file.type; // some browsers give empty type for epub

    if (!hasValidExt && !hasValidMime) {
      setClientError("Please select a valid PDF (.pdf) or EPUB (.epub) document.");
      return;
    }

    // 2. Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setClientError(`File size exceeds the ${maxSizeMB}MB limit.`);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isUploading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
      e.target.value = ""; // Reset input so same file can be selected again if needed
    }
  };

  const activeError = error || clientError;

  return (
    <div
      className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ""} ${
        activeError ? styles.errorState : ""
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={disabled || isUploading ? -1 : 0}
      role="button"
      aria-label="Upload book document: Drag and drop PDF or EPUB here or click to browse"
      aria-disabled={disabled || isUploading}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        onChange={handleInputChange}
        className={styles.hiddenInput}
        aria-hidden="true"
        disabled={disabled || isUploading}
      />

      {isUploading ? (
        <UploadProgress
          progress={uploadProgress}
          fileName={uploadFileName}
          statusText="Extracting metadata and uploading book..."
        />
      ) : (
        <>
          <div className={styles.iconWrapper} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div className={styles.title}>
            {isDragOver ? "Drop your book file here" : "Choose a book file or drag it here"}
          </div>

          <div className={styles.subtitle}>
            Book title, author, and page counts are extracted automatically
          </div>

          <div className={styles.formats}>
            <span className={styles.formatBadge}>PDF</span>
            <span className={styles.formatBadge}>EPUB</span>
            <span>(up to {maxSizeMB}MB)</span>
          </div>

          {activeError && (
            <div className={styles.errorMessage} role="alert">
              {activeError}
            </div>
          )}
        </>
      )}
    </div>
  );
};
