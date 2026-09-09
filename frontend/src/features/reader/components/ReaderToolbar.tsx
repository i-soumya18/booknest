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
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: number) => void;
  onThemeChange: (newTheme: ReaderTheme) => void;
  onToggleFocusMode: () => void;
  onToggleEyeSafetyMode: () => void;
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
  onPageChange,
  onZoomChange,
  onThemeChange,
  onToggleFocusMode,
  onToggleEyeSafetyMode,
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

          <button
            className={`${styles.iconBtn} ${
              eyeSafetyMode ? styles.iconBtnActive : ""
            }`}
            onClick={onToggleEyeSafetyMode}
            title={eyeSafetyMode ? "Eye Safety: Active" : "Enable Eye Safety Mode"}
            aria-label="Toggle Eye Safety Mode"
          >
            🛡️
          </button>

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
