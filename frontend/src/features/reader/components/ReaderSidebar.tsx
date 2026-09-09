import React, { useState } from "react";
import styles from "./ReaderSidebar.module.css";
import { Highlight } from "@/types";

interface ReaderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onNavigateToPage: (page: number) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onAddAnnotation: (highlightId: string, content: string) => void;
  onDeleteAnnotation: (highlightId: string, annotationId: string) => void;
  activeTab?: "highlights" | "toc" | "notes" | "bookmarks";
}

const COLOR_MAP: Record<string, string> = {
  yellow: "#facc15",
  green: "#4ade80",
  blue: "#38bdf8",
  pink: "#f472b6",
  purple: "#c084fc",
};

export const ReaderSidebar: React.FC<ReaderSidebarProps> = ({
  isOpen,
  onClose,
  highlights,
  onNavigateToPage,
  onDeleteHighlight,
  onAddAnnotation,
  onDeleteAnnotation,
  activeTab = "highlights",
}) => {
  const [currentTab, setCurrentTab] = useState<"highlights" | "toc" | "notes" | "bookmarks">(activeTab);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const handleNoteInputChange = (highlightId: string, text: string) => {
    setNoteInputs((prev) => ({ ...prev, [highlightId]: text }));
  };

  const handleNoteSubmit = (e: React.FormEvent, highlightId: string) => {
    e.preventDefault();
    const text = noteInputs[highlightId]?.trim();
    if (!text) return;
    onAddAnnotation(highlightId, text);
    setNoteInputs((prev) => ({ ...prev, [highlightId]: "" }));
  };

  return (
    <aside
      className={`${styles.sidebarContainer} ${isOpen ? styles.sidebarOpen : ""}`}
      aria-label="Reader Sidebar"
    >
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>Reader Tools</h3>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="Close Sidebar (ESC)"
          aria-label="Close Sidebar"
        >
          ✕
        </button>
      </div>

      <div className={styles.tabList} role="tablist">
        <button
          className={`${styles.tabBtn} ${
            currentTab === "highlights" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setCurrentTab("highlights")}
          role="tab"
          aria-selected={currentTab === "highlights"}
        >
          ✏️ Highlights ({highlights.length})
        </button>
        <button
          className={`${styles.tabBtn} ${
            currentTab === "toc" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setCurrentTab("toc")}
          role="tab"
          aria-selected={currentTab === "toc"}
        >
          📑 TOC
        </button>
        <button
          className={`${styles.tabBtn} ${
            currentTab === "notes" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setCurrentTab("notes")}
          role="tab"
          aria-selected={currentTab === "notes"}
        >
          📝 Notes
        </button>
        <button
          className={`${styles.tabBtn} ${
            currentTab === "bookmarks" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setCurrentTab("bookmarks")}
          role="tab"
          aria-selected={currentTab === "bookmarks"}
        >
          🔖 Bookmarks
        </button>
      </div>

      <div className={styles.contentArea}>
        {currentTab === "highlights" && (
          <>
            {highlights.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No highlights yet.</p>
                <p>Select any text in the book to create your first highlight.</p>
              </div>
            ) : (
              highlights.map((h) => (
                <div
                  key={h.id}
                  className={styles.highlightCard}
                  onClick={() => onNavigateToPage(h.page_number)}
                >
                  <div className={styles.cardTopRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        className={styles.colorIndicator}
                        style={{ backgroundColor: COLOR_MAP[h.color] || "#facc15" }}
                      />
                      <span className={styles.pageBadge}>Page {h.page_number}</span>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      title="Delete highlight"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHighlight(h.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>

                  <p className={styles.snippetText}>&ldquo;{h.selected_text}&rdquo;</p>

                  {/* Annotations List */}
                  {h.annotations && h.annotations.length > 0 && (
                    <div
                      className={styles.annotationsSection}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {h.annotations.map((ann) => (
                        <div key={ann.id} className={styles.annotationItem}>
                          <span>{ann.content}</span>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => onDeleteAnnotation(h.id, ann.id)}
                            title="Delete note"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Annotation Form */}
                  <form
                    className={styles.noteForm}
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={(e) => handleNoteSubmit(e, h.id)}
                  >
                    <input
                      type="text"
                      placeholder="Add a note..."
                      className={styles.noteInput}
                      value={noteInputs[h.id] || ""}
                      onChange={(e) => handleNoteInputChange(h.id, e.target.value)}
                    />
                    <button type="submit" className={styles.noteSaveBtn}>
                      Add
                    </button>
                  </form>
                </div>
              ))
            )}
          </>
        )}

        {currentTab === "toc" && (
          <div className={styles.emptyState}>
            <p>Table of Contents</p>
            <p>Ready for Phase 24 full outline & navigation.</p>
          </div>
        )}

        {currentTab === "notes" && (
          <div className={styles.emptyState}>
            <p>Book Notes</p>
            <p>Ready for Phase 25 multimedia notes.</p>
          </div>
        )}

        {currentTab === "bookmarks" && (
          <div className={styles.emptyState}>
            <p>Bookmarks</p>
            <p>Ready for Phase 24 named bookmarks.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
