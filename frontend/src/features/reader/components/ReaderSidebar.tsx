import React, { useState } from "react";
import styles from "./ReaderSidebar.module.css";
import { Bookmark, Highlight, SearchResult, TocItem } from "@/types";

interface ReaderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  // Highlights
  highlights: Highlight[];
  onNavigateToPage: (page: number, cfiOrHref?: string) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onAddAnnotation: (highlightId: string, content: string) => void;
  onDeleteAnnotation: (highlightId: string, annotationId: string) => void;
  // Bookmarks
  bookmarks: Bookmark[];
  onAddBookmark: (page: number, label?: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  // TOC
  tocItems: TocItem[];
  // Search
  searchResults: SearchResult[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  activeTab?: "highlights" | "toc" | "search" | "bookmarks";
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
  currentPage,
  highlights,
  onNavigateToPage,
  onDeleteHighlight,
  onAddAnnotation,
  onDeleteAnnotation,
  bookmarks,
  onAddBookmark,
  onDeleteBookmark,
  tocItems,
  searchResults,
  isSearching,
  onSearch,
  activeTab = "highlights",
}) => {
  const [currentTab, setCurrentTab] = useState<"highlights" | "toc" | "search" | "bookmarks">(activeTab);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkLabelInput, setBookmarkLabelInput] = useState("");

  React.useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleBookmarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBookmark(currentPage, bookmarkLabelInput.trim() || undefined);
    setBookmarkLabelInput("");
  };

  const isCurrentPageBookmarked = bookmarks.some((b) => b.page_number === currentPage);

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
            currentTab === "bookmarks" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setCurrentTab("bookmarks")}
          role="tab"
          aria-selected={currentTab === "bookmarks"}
        >
          🔖 Marks ({bookmarks.length})
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
            currentTab === "search" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setCurrentTab("search")}
          role="tab"
          aria-selected={currentTab === "search"}
        >
          🔍 Search
        </button>
      </div>

      <div className={styles.contentArea}>
        {/* Highlights Tab */}
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

        {/* Bookmarks Tab */}
        {currentTab === "bookmarks" && (
          <>
            <form className={styles.noteForm} onSubmit={handleBookmarkSubmit}>
              <input
                type="text"
                placeholder={`Bookmark Page ${currentPage}...`}
                className={styles.noteInput}
                value={bookmarkLabelInput}
                onChange={(e) => setBookmarkLabelInput(e.target.value)}
              />
              <button
                type="submit"
                className={styles.noteSaveBtn}
                disabled={isCurrentPageBookmarked}
              >
                {isCurrentPageBookmarked ? "Saved" : "+ Add"}
              </button>
            </form>

            {bookmarks.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No bookmarks yet.</p>
                <p>Bookmark your favorite chapters or where you paused reading.</p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className={styles.highlightCard}
                  onClick={() => onNavigateToPage(bm.page_number)}
                >
                  <div className={styles.cardTopRow}>
                    <span className={styles.pageBadge}>Page {bm.page_number}</span>
                    <button
                      className={styles.deleteBtn}
                      title="Remove bookmark"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBookmark(bm.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#f8fafc", fontWeight: 500 }}>
                    {bm.label || `Page ${bm.page_number}`}
                  </p>
                </div>
              ))
            )}
          </>
        )}

        {/* Table of Contents Tab */}
        {currentTab === "toc" && (
          <>
            {tocItems.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No Table of Contents available.</p>
                <p>This document does not define an outline.</p>
              </div>
            ) : (
              tocItems.map((item, idx) => (
                <div
                  key={idx}
                  className={styles.highlightCard}
                  onClick={() => onNavigateToPage(item.pageNumber || 1, item.href)}
                >
                  <div className={styles.cardTopRow}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#f8fafc" }}>
                      {item.title}
                    </span>
                    <span className={styles.pageBadge}>
                      {item.pageNumber ? `p. ${item.pageNumber}` : "Chapter"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Search Tab */}
        {currentTab === "search" && (
          <>
            <form className={styles.noteForm} onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search in book..."
                className={styles.noteInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className={styles.noteSaveBtn} disabled={isSearching}>
                {isSearching ? "..." : "Find"}
              </button>
            </form>

            {isSearching && (
              <div className={styles.emptyState}>
                <p>Searching document...</p>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              searchResults.map((res, idx) => (
                <div
                  key={idx}
                  className={styles.highlightCard}
                  onClick={() => onNavigateToPage(res.pageNumber, res.cfi)}
                >
                  <div className={styles.cardTopRow}>
                    <span className={styles.pageBadge}>Page {res.pageNumber}</span>
                  </div>
                  <p className={styles.snippetText}>&ldquo;{res.snippet}&rdquo;</p>
                </div>
              ))
            )}

            {!isSearching && searchQuery && searchResults.length === 0 && (
              <div className={styles.emptyState}>
                <p>No matches found for &ldquo;{searchQuery}&rdquo;.</p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
