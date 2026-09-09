"use client";

import { useEffect, useState } from "react";
import { AdminFileItem, deleteAdminFile, listAdminFiles } from "@/features/admin";
import { Spinner, useToast } from "@/components/ui";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function AdminModerationTab() {
  const [files, setFiles] = useState<AdminFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await listAdminFiles();
      setFiles(data);
    } catch (err) {
      toastError("Failed to load uploaded files", err instanceof Error ? err.message : "Error fetching file list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteFile = async (file: AdminFileItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete file "${file.original_name}" attached to "${file.book_title}"?\n\nThis will remove the file from storage and reset book progress for readers.`
    );
    if (!confirmed) return;

    setDeletingId(file.id);
    try {
      await deleteAdminFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      success("File Removed", `File "${file.original_name}" was successfully deleted from system storage.`);
    } catch (err) {
      toastError("Failed to delete file", err instanceof Error ? err.message : "Error deleting file");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            Content & Storage Moderation
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
            Inspect uploaded documents (PDF / EPUB) across all books and prune inappropriate content.
          </p>
        </div>

        <button onClick={fetchFiles} disabled={loading} className="btn btn-secondary btn-sm">
          {loading ? <Spinner /> : "🔄"} Refresh Files
        </button>
      </div>

      <div
        className="design-card"
        style={{
          padding: 0,
          overflowX: "auto",
          background: "rgba(15, 23, 42, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {loading && files.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <Spinner />
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-muted)" }}>
            No uploaded book files found in storage.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(30, 41, 59, 0.6)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Book Title</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>File Name</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Size</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Format</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Pages</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Uploader</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Uploaded Date</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const isDeleting = deletingId === f.id;
                return (
                  <tr
                    key={f.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "background 0.15s ease",
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#ffffff" }}>
                      {f.book_title}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-secondary)" }}>
                      {f.original_name}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-muted)" }}>
                      {formatBytes(f.file_size_bytes)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: f.mime_type.includes("pdf") ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)",
                          color: f.mime_type.includes("pdf") ? "#f87171" : "#38bdf8",
                        }}
                      >
                        {f.mime_type.includes("pdf") ? "PDF" : "EPUB"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#ffffff" }}>
                      {f.page_count ?? "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-secondary)", fontSize: "12px" }}>
                      {f.uploader_email ?? "Unknown"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-muted)", fontSize: "12px" }}>
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <button
                        onClick={() => handleDeleteFile(f)}
                        disabled={isDeleting}
                        className="btn btn-danger btn-xs"
                        title="Delete file from storage volume"
                      >
                        {isDeleting ? <Spinner /> : "🗑️ Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
