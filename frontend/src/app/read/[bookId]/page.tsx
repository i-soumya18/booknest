"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  addAnnotation,
  createHighlight,
  deleteAnnotation,
  deleteHighlight,
  getBookDetails,
  getBookFileBlob,
  getHighlights,
} from "@/features/reader/api/readerApi";
import { HighlightPopover } from "@/features/reader/components/HighlightPopover";
import { ReaderSidebar } from "@/features/reader/components/ReaderSidebar";
import { ReaderToolbar } from "@/features/reader/components/ReaderToolbar";
import { useReaderProgress } from "@/features/reader/hooks/useReaderProgress";
import { Book, Highlight, HighlightColor } from "@/types";
import styles from "./ReaderPage.module.css";

// Dynamically import PDF and EPUB renderers with ssr: false for client canvas/DOM rendering
const DynamicPdfReader = dynamic(
  () =>
    import("@/features/reader/components/PdfReader").then((mod) => mod.PdfReader),
  { ssr: false }
);

const DynamicEpubReader = dynamic(
  () =>
    import("@/features/reader/components/EpubReader").then((mod) => mod.EpubReader),
  { ssr: false }
);

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Array.isArray(params?.bookId) ? params.bookId[0] : (params?.bookId as string);

  const [book, setBook] = useState<Book | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileMime, setFileMime] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Highlights & annotations state
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Selection popover state
  const [selectionPopover, setSelectionPopover] = useState<{
    x: number;
    y: number;
    selectedText: string;
  } | null>(null);

  const {
    currentPage,
    zoomLevel,
    theme,
    fontSize,
    focusMode,
    eyeSafetyMode,
    setPage,
    updateZoom,
    updateTheme,
    toggleFocusMode,
    toggleEyeSafetyMode,
  } = useReaderProgress({
    bookId,
    totalPages,
    initialPage: 1,
  });

  // Fetch book metadata, file, and highlights
  useEffect(() => {
    let isCancelled = false;

    async function loadBookData() {
      if (!bookId) return;
      try {
        setIsLoadingBook(true);
        setErrorMessage(null);

        // Fetch book details
        const bookData = await getBookDetails(bookId);
        if (isCancelled) return;
        setBook(bookData);
        if (bookData.totalPages || bookData.total_pages) {
          setTotalPages(bookData.totalPages || bookData.total_pages || 1);
        }

        // Fetch file blob
        const { blob, mimeType } = await getBookFileBlob(bookId);
        if (isCancelled) return;
        setFileBlob(blob);
        setFileMime(mimeType);

        // Fetch user's highlights
        try {
          const userHighlights = await getHighlights(bookId);
          if (!isCancelled) {
            setHighlights(userHighlights);
          }
        } catch {
          // Non-blocking if highlights fail
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Failed to load book:", err);
          setErrorMessage(err?.message || "Failed to load reader document");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBook(false);
        }
      }
    }

    loadBookData();

    return () => {
      isCancelled = true;
    };
  }, [bookId]);

  // Handle text selection in reader
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 2) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionPopover({
          x: rect.left + rect.width / 2,
          y: rect.top,
          selectedText: text,
        });
      } catch {
        // Ignore selection rect errors
      }
    }
  };

  const handleCreateHighlight = async (color: HighlightColor) => {
    if (!selectionPopover || !bookId) return;
    const textToHighlight = selectionPopover.selectedText;
    setSelectionPopover(null);
    window.getSelection()?.removeAllRanges();

    try {
      const newHighlight = await createHighlight(bookId, {
        page_number: currentPage,
        selected_text: textToHighlight,
        color,
      });
      setHighlights((prev) => [...prev, newHighlight]);
      setIsSidebarOpen(true);
    } catch (err) {
      console.error("Failed to create highlight:", err);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!bookId) return;
    try {
      await deleteHighlight(bookId, highlightId);
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (err) {
      console.error("Failed to delete highlight:", err);
    }
  };

  const handleAddAnnotation = async (highlightId: string, content: string) => {
    if (!bookId) return;
    try {
      const newAnn = await addAnnotation(bookId, highlightId, content);
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId
            ? { ...h, annotations: [...(h.annotations || []), newAnn] }
            : h
        )
      );
    } catch (err) {
      console.error("Failed to add annotation:", err);
    }
  };

  const handleDeleteAnnotation = async (highlightId: string, annotationId: string) => {
    if (!bookId) return;
    try {
      await deleteAnnotation(bookId, highlightId, annotationId);
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId
            ? {
                ...h,
                annotations: (h.annotations || []).filter((a) => a.id !== annotationId),
              }
            : h
        )
      );
    } catch (err) {
      console.error("Failed to delete annotation:", err);
    }
  };

  // Global keyboard shortcuts (§60)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPage(currentPage - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPage(currentPage + 1);
      } else if (e.key === " " && !e.shiftKey) {
        e.preventDefault();
        setPage(currentPage + 1);
      } else if (e.key === " " && e.shiftKey) {
        e.preventDefault();
        setPage(currentPage - 1);
      } else if (e.key === "Escape") {
        if (selectionPopover) {
          setSelectionPopover(null);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (focusMode) {
          e.preventDefault();
          toggleFocusMode();
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFocusMode();
      } else if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        updateTheme(theme === "dark" ? "light" : "dark");
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        updateZoom(zoomLevel + 0.15);
      } else if (e.key === "-") {
        e.preventDefault();
        updateZoom(zoomLevel - 0.15);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentPage,
    focusMode,
    isSidebarOpen,
    selectionPopover,
    theme,
    zoomLevel,
    setPage,
    toggleFocusMode,
    updateTheme,
    updateZoom,
  ]);

  if (isLoadingBook) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <h2>Opening Book in Reader...</h2>
        <p>Preparing pages and reading tools</p>
      </div>
    );
  }

  if (errorMessage || !fileBlob) {
    return (
      <div className={styles.errorScreen}>
        <h2 className={styles.errorTitle}>Unable to Open Reader</h2>
        <p>{errorMessage || "This book does not have an uploaded file attached."}</p>
        <Link href="/books" className={styles.returnBtn}>
          ← Back to Library
        </Link>
      </div>
    );
  }

  const isEpub =
    fileMime.includes("epub") ||
    book?.file?.mimeType?.includes("epub") ||
    book?.file?.mime_type?.includes("epub");

  const themeClass =
    theme === "dark"
      ? styles.themeDark
      : theme === "sepia"
      ? styles.themeSepia
      : styles.themeLight;

  return (
    <div className={`${styles.readerContainer} ${themeClass}`}>
      {eyeSafetyMode && <div className={styles.eyeSafetyFilter} />}

      <ReaderToolbar
        title={book?.title || "Book"}
        author={book?.author || "Author"}
        currentPage={currentPage}
        totalPages={totalPages}
        zoomLevel={zoomLevel}
        theme={theme}
        focusMode={focusMode}
        eyeSafetyMode={eyeSafetyMode}
        highlightsCount={highlights.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onPageChange={setPage}
        onZoomChange={updateZoom}
        onThemeChange={updateTheme}
        onToggleFocusMode={toggleFocusMode}
        onToggleEyeSafetyMode={toggleEyeSafetyMode}
        onFitWidth={() => updateZoom(1.25)}
        onFitPage={() => updateZoom(1.0)}
      />

      <main className={styles.readerContent} onMouseUp={handleMouseUp}>
        {isEpub ? (
          <DynamicEpubReader
            fileBlob={fileBlob}
            currentPage={currentPage}
            theme={theme}
            fontSize={fontSize}
            onPageChange={(p) => setPage(p)}
            onTotalPagesLoaded={(t) => setTotalPages(t)}
          />
        ) : (
          <DynamicPdfReader
            fileBlob={fileBlob}
            currentPage={currentPage}
            zoomLevel={zoomLevel}
            onPageChange={(p) => setPage(p)}
            onTotalPagesLoaded={(t) => setTotalPages(t)}
          />
        )}
      </main>

      {/* Floating 5-color Highlight Popover on selection */}
      {selectionPopover && (
        <HighlightPopover
          x={selectionPopover.x}
          y={selectionPopover.y}
          onSelectColor={handleCreateHighlight}
          onClose={() => setSelectionPopover(null)}
        />
      )}

      {/* Reader Sidebar with Highlights & Annotations */}
      <ReaderSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        highlights={highlights}
        onNavigateToPage={(p) => setPage(p)}
        onDeleteHighlight={handleDeleteHighlight}
        onAddAnnotation={handleAddAnnotation}
        onDeleteAnnotation={handleDeleteAnnotation}
      />
    </div>
  );
}
