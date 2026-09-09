import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./ReaderToolbar.module.css";
import { ReaderTheme } from "@/types";

interface ReaderToolbarProps {
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  theme: ReaderTheme;
  focusMode: boolean;
  eyeSafetyMode: boolean;
  isBookmarked?: boolean;
  readingMinutes?: number;
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: number) => void;
  onThemeChange: (newTheme: ReaderTheme) => void;
  onToggleFocusMode: () => void;
  onToggleEyeSafetyMode: () => void;
  onOpenEyeSafetySettings?: () => void;
  onToggleBookmark?: () => void;
  onOpenSearch?: () => void;
  onOpenToc?: () => void;
  highlightsCount?: number;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
}

export const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  title,
  author,
  currentPage,
  totalPages,
  zoomLevel,
  theme,
  focusMode,
  eyeSafetyMode,
  isBookmarked = false,
  readingMinutes = 0,
  highlightsCount = 0,
  isSidebarOpen = false,
  onToggleSidebar,
  onPageChange,
  onZoomChange,
  onThemeChange,
  onToggleFocusMode,
  onToggleEyeSafetyMode,
  onOpenEyeSafetySettings,
  onToggleBookmark,
  onOpenSearch,
  onOpenToc,
  onFitWidth,
  onFitPage,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [inputVal, setInputVal] = useState(String(currentPage));

  useEffect(() => {
    setInputVal(String(currentPage));
  }, [currentPage]);

  // Auto-hide toolbar after 3 seconds of inactivity
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const showAndScheduleHide = () => {
      setIsVisible(true);
      if (timer) clearTimeout(timer);
      if (!focusMode) {
        timer = setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    };

    if (focusMode) {
      setIsVisible(false);
    } else {
      showAndScheduleHide();
    }

    const handleMouseMove = () => {
      showAndScheduleHide();
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [focusMode]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(inputVal, 10);
    if (!isNaN(num)) {
      onPageChange(num);
    } else {
      setInputVal(String(currentPage));
    }
  };

  const progressPercent =
    totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  return (
    <>
      {focusMode && (
        <div
          className={styles.focusModeTrigger}
          title="Click or press ESC to show toolbar"
          onClick={() => setIsVisible(true)}
        />
      )}
      <header
        className={`${styles.toolbarContainer} ${
          !isVisible ? styles.toolbarHidden : ""
        }`}
        onMouseEnter={() => setIsVisible(true)}
      >
        {/* Left Section: Back button & Title */}
        <div className={styles.leftSection}>
          <Link href="/books" className={styles.backBtn} title="Return to Library">
            ← Library
          </Link>
          <div className={styles.bookMeta}>
            <span className={styles.bookTitle} title={title}>
              {title}
            </span>
            <span className={styles.bookAuthor} title={author}>
              {author}
            </span>
          </div>
        </div>

        {/* Center Section: Navigation & Page input */}
        <div className={styles.centerSection}>
          <button
            className={styles.navBtn}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous Page (←)"
            aria-label="Previous Page"
          >
            ←
          </button>

          <form onSubmit={handlePageInputSubmit} className={styles.pageIndicator}>
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={handlePageInputSubmit}
              className={styles.pageInput}
              aria-label="Current page number"
            />
            <span>of {totalPages || 1}</span>
          </form>

          <button
            className={styles.navBtn}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Next Page (→)"
            aria-label="Next Page"
          >
            →
          </button>
        </div>

        {/* Right Section: Zoom, Theme, Focus Mode, Eye Safety */}
        <div className={styles.rightSection}>
          <div className={styles.zoomGroup}>
            {onFitWidth && (
              <button
                className={styles.zoomBtn}
                onClick={onFitWidth}
                title="Fit Width"
              >
                Fit W
              </button>
            )}
            {onFitPage && (
              <button
                className={styles.zoomBtn}
                onClick={onFitPage}
                title="Fit Page"
              >
                Fit P
              </button>
            )}
            <button
              className={styles.zoomBtn}
              onClick={() => onZoomChange(zoomLevel - 0.15)}
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              -
            </button>
            <span className={styles.zoomLabel}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              className={styles.zoomBtn}
              onClick={() => onZoomChange(zoomLevel + 0.15)}
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          <div className={styles.themeSelector}>
            <button
              className={`${styles.themeBtn} ${
                theme === "light" ? styles.themeBtnActive : ""
              }`}
              onClick={() => onThemeChange("light")}
              title="Light theme"
            >
              ☀️
            </button>
            <button
              className={`${styles.themeBtn} ${
                theme === "sepia" ? styles.themeBtnActive : ""
              }`}
              onClick={() => onThemeChange("sepia")}
              title="Sepia theme"
            >
              📜
            </button>
            <button
              className={`${styles.themeBtn} ${
                theme === "dark" ? styles.themeBtnActive : ""
              }`}
              onClick={() => onThemeChange("dark")}
              title="Dark theme"
            >
              🌙
            </button>
          </div>

          {onToggleBookmark && (
            <button
              className={`${styles.iconBtn} ${isBookmarked ? styles.iconBtnActive : ""}`}
              onClick={onToggleBookmark}
              title={isBookmarked ? "Remove Bookmark (Ctrl+B)" : "Bookmark Page (Ctrl+B)"}
              aria-label="Toggle Bookmark"
            >
              🔖
            </button>
          )}

          {onOpenToc && (
            <button
              className={styles.iconBtn}
              onClick={onOpenToc}
              title="Table of Contents"
              aria-label="Table of Contents"
            >
              📑
            </button>
          )}

          {onOpenSearch && (
            <button
              className={styles.iconBtn}
              onClick={onOpenSearch}
              title="Search Book (Ctrl+F)"
              aria-label="Search Book"
            >
              🔍
            </button>
          )}

          <button
            className={`${styles.iconBtn} ${
              eyeSafetyMode ? styles.iconBtnActive : ""
            }`}
            onClick={onOpenEyeSafetySettings || onToggleEyeSafetyMode}
            title={eyeSafetyMode ? "Eye Safety Settings (Active)" : "Eye Safety Settings"}
            aria-label="Eye Safety Settings"
          >
            🛡️
          </button>

          {readingMinutes > 0 && (
            <div
              className={styles.iconBtn}
              style={{ width: "auto", padding: "0 6px", fontSize: "0.75rem", cursor: "default", opacity: 0.85 }}
              title={`Reading session duration: ${readingMinutes} minutes`}
            >
              ⏱️ {readingMinutes}m
            </div>
          )}

          <button
            className={`${styles.iconBtn} ${
              focusMode ? styles.iconBtnActive : ""
            }`}
            onClick={onToggleFocusMode}
            title={focusMode ? "Exit Focus Mode (ESC)" : "Enter Focus Mode (Ctrl+Shift+F)"}
            aria-label="Toggle Focus Mode"
          >
            ⛶
          </button>

          {onToggleSidebar && (
            <button
              className={`${styles.iconBtn} ${
                isSidebarOpen ? styles.iconBtnActive : ""
              }`}
              onClick={onToggleSidebar}
              title="Toggle Highlights & Tools (Ctrl+H)"
              aria-label="Toggle Highlights Panel"
              style={{ width: "auto", padding: "0 8px", fontSize: "0.8rem", gap: "4px" }}
            >
              ✏️ {highlightsCount > 0 && <span>{highlightsCount}</span>}
            </button>
          )}
        </div>

        {/* Progress bar across bottom of toolbar */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>
    </>
  );
};
