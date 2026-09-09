"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  addAnnotation,
  createBookmark,
  createHighlight,
  createNote,
  deleteAnnotation,
  deleteBookmark,
  deleteHighlight,
  deleteNote,
  deleteNoteAttachment,
  getBookDetails,
  getBookFileBlob,
  getBookmarks,
  getHighlights,
  getNotes,
  updateNote,
  uploadNoteAttachment,
} from "@/features/reader/api/readerApi";
import { EyeSafetyPopover } from "@/features/reader/components/EyeSafetyPopover";
import { HighlightPopover } from "@/features/reader/components/HighlightPopover";
import { ReaderSidebar } from "@/features/reader/components/ReaderSidebar";
import { ReaderToolbar } from "@/features/reader/components/ReaderToolbar";
import { ReadingBreakToast } from "@/features/reader/components/ReadingBreakToast";
import { useReaderProgress } from "@/features/reader/hooks/useReaderProgress";
import { useAuth } from "@/features/auth";
import {
  Book,
  Bookmark,
  Highlight,
  HighlightColor,
  ReaderNote,
  SearchResult,
  TocItem,
} from "@/types";
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
  const { user, loading: authLoading } = useAuth();
  const bookId = Array.isArray(params?.bookId) ? params.bookId[0] : (params?.bookId as string);

  const [book, setBook] = useState<Book | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileMime, setFileMime] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reader tools state
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [targetCfiOrHref, setTargetCfiOrHref] = useState<string | null>(null);

  // Sidebar & Popover state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"notes" | "highlights" | "toc" | "search" | "bookmarks">("notes");
  const [isEyeSafetyPopoverOpen, setIsEyeSafetyPopoverOpen] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<{
    x: number;
    y: number;
    selectedText: string;
  } | null>(null);

  // Eye Safety & Timer states
  const [warmth, setWarmth] = useState(35);
  const [brightness, setBrightness] = useState(90);
  const [breakIntervalMinutes, setBreakIntervalMinutes] = useState(20);
  const [readingMinutes, setReadingMinutes] = useState(0);
  const [showBreakToast, setShowBreakToast] = useState(false);

  // Document references for search
  const pdfDocRef = useRef<any>(null);
  const epubBookRef = useRef<any>(null);

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
    enabled: Boolean(user && !authLoading),
  });

  // Reading session timer (increments every minute and triggers eye breaks)
  useEffect(() => {
    const interval = setInterval(() => {
      setReadingMinutes((prev) => {
        const next = prev + 1;
        if (breakIntervalMinutes > 0 && next % breakIntervalMinutes === 0) {
          setShowBreakToast(true);
        }
        return next;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [breakIntervalMinutes]);

  // Fetch book metadata, file, notes, highlights, and bookmarks
  useEffect(() => {
    let isCancelled = false;

    async function loadBookData() {
      if (!bookId) return;
      if (authLoading) return;
      if (!user) {
        setIsLoadingBook(false);
        return;
      }

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

        // If no file attached to this book
        if (!bookData.file) {
          setErrorMessage("No PDF or EPUB file has been uploaded for this book yet. Please upload a book document first.");
          setIsLoadingBook(false);
          return;
        }

        // Fetch file blob
        const { blob, mimeType } = await getBookFileBlob(bookId);
        if (isCancelled) return;
        setFileBlob(blob);
        setFileMime(mimeType || bookData.file.mimeType || bookData.file.mime_type || "application/pdf");

        // Fetch user's notes
        try {
          const userNotes = await getNotes(bookId);
          if (!isCancelled) {
            setNotes(userNotes);
          }
        } catch {
          // Non-blocking
        }

        // Fetch user's highlights
        try {
          const userHighlights = await getHighlights(bookId);
          if (!isCancelled) {
            setHighlights(userHighlights);
          }
        } catch {
          // Non-blocking
        }

        // Fetch user's bookmarks
        try {
          const userBookmarks = await getBookmarks(bookId);
          if (!isCancelled) {
            setBookmarks(userBookmarks);
          }
        } catch {
          // Non-blocking
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
  }, [bookId, user, authLoading]);

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

  const handleEpubSelection = (text: string, x: number, y: number) => {
    setSelectionPopover({
      x,
      y,
      selectedText: text,
    });
  };

  // Highlights handlers
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
      setSidebarTab("highlights");
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

  // Notes handlers
  const handleCreateNote = async (
    content: string,
    pageNumber: number | null,
    imageFile?: File | null,
    audioBlob?: Blob | null,
    audioDuration?: number
  ) => {
    if (!bookId) return;
    try {
      const created = await createNote(bookId, {
        page_number: pageNumber,
        content,
      });

      let updatedNote = created;
      if (imageFile) {
        const att = await uploadNoteAttachment(bookId, created.id, imageFile);
        updatedNote = { ...updatedNote, attachments: [...(updatedNote.attachments || []), att] };
      }
      if (audioBlob) {
        const att = await uploadNoteAttachment(bookId, created.id, audioBlob, audioDuration, "memo.webm");
        updatedNote = { ...updatedNote, attachments: [...(updatedNote.attachments || []), att] };
      }

      setNotes((prev) => [updatedNote, ...prev]);
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    if (!bookId) return;
    try {
      const updated = await updateNote(bookId, noteId, { content });
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, content: updated.content } : n))
      );
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!bookId) return;
    try {
      await deleteNote(bookId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleDeleteNoteAttachment = async (noteId: string, attachmentId: string) => {
    if (!bookId) return;
    try {
      await deleteNoteAttachment(bookId, noteId, attachmentId);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, attachments: n.attachments.filter((a) => a.id !== attachmentId) }
            : n
        )
      );
    } catch (err) {
      console.error("Failed to delete note attachment:", err);
    }
  };

  // Bookmarks handlers
  const isCurrentPageBookmarked = bookmarks.some(
    (b) => b.page_number === currentPage
  );

  const handleToggleBookmark = useCallback(async () => {
    if (!bookId) return;
    const existing = bookmarks.find((b) => b.page_number === currentPage);
    if (existing) {
      try {
        await deleteBookmark(bookId, existing.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
      } catch (err) {
        console.error("Failed to delete bookmark:", err);
      }
    } else {
      try {
        const newBm = await createBookmark(bookId, {
          page_number: currentPage,
          label: `Page ${currentPage}`,
        });
        setBookmarks((prev) => [...prev, newBm]);
      } catch (err) {
        console.error("Failed to create bookmark:", err);
      }
    }
  }, [bookId, bookmarks, currentPage]);

  const handleAddBookmarkWithLabel = async (page: number, label?: string) => {
    if (!bookId) return;
    try {
      const newBm = await createBookmark(bookId, {
        page_number: page,
        label: label || `Page ${page}`,
      });
      setBookmarks((prev) => [...prev, newBm]);
    } catch (err) {
      console.error("Failed to add bookmark:", err);
    }
  };

  const handleDeleteBookmarkById = async (bookmarkId: string) => {
    if (!bookId) return;
    try {
      await deleteBookmark(bookId, bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    }
  };

  // Document Search across PDF and EPUB
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      const lowerQuery = query.toLowerCase();

      // Search PDF via pdfjs
      if (pdfDocRef.current) {
        const doc = pdfDocRef.current;
        const results: SearchResult[] = [];
        const maxPages = Math.min(doc.numPages, 300);

        for (let i = 1; i <= maxPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");

          const matchIdx = pageText.toLowerCase().indexOf(lowerQuery);
          if (matchIdx !== -1) {
            const start = Math.max(0, matchIdx - 35);
            const end = Math.min(pageText.length, matchIdx + query.length + 35);
            results.push({
              pageNumber: i,
              snippet: (start > 0 ? "..." : "") + pageText.substring(start, end).trim() + (end < pageText.length ? "..." : ""),
            });
            if (results.length >= 40) break;
          }
        }
        setSearchResults(results);
      } else if (epubBookRef.current) {
        // Search EPUB via epubjs find
        const book = epubBookRef.current;
        const rawResults = await (book as any).find(query);
        const results: SearchResult[] = (rawResults || []).slice(0, 40).map((r: any) => ({
          pageNumber: 1,
          cfi: r.cfi,
          snippet: r.excerpt,
        }));
        setSearchResults(results);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNavigateToPageOrTarget = (page: number, cfiOrHref?: string) => {
    if (cfiOrHref) {
      setTargetCfiOrHref(cfiOrHref);
    }
    setPage(page);
  };

  const handleToggleBookmarkRef = useRef(handleToggleBookmark);
  useEffect(() => {
    handleToggleBookmarkRef.current = handleToggleBookmark;
  }, [handleToggleBookmark]);

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
        } else if (isEyeSafetyPopoverOpen) {
          setIsEyeSafetyPopoverOpen(false);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (focusMode) {
          e.preventDefault();
          toggleFocusMode();
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setSidebarTab("notes");
        setIsSidebarOpen(true);
      } else if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggleBookmarkRef.current();
      } else if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSidebarTab("search");
        setIsSidebarOpen(true);
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
    isEyeSafetyPopoverOpen,
    selectionPopover,
    theme,
    zoomLevel,
    bookmarks,
    setPage,
    toggleFocusMode,
    updateTheme,
    updateZoom,
  ]);

  if (authLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <h2>Verifying Access...</h2>
        <p>Checking your BookNest reading session</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.errorScreen}>
        <h2 className={styles.errorTitle}>Sign In to Read</h2>
        <p>You need to be signed in to your BookNest account to open and read books.</p>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", justifyContent: "center" }}>
          <Link
            href={`/login?redirect=/read/${bookId}`}
            className={styles.returnBtn}
            style={{ background: "var(--color-accent-primary)", color: "#000", fontWeight: 600 }}
          >
            Sign In Now
          </Link>
          <Link href="/books" className={styles.returnBtn}>
            ← Back to Library
          </Link>
        </div>
      </div>
    );
  }

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
      {/* Dynamic Eye-Safety Warmth and Brightness Tint */}
      {eyeSafetyMode && (
        <div
          className={styles.eyeSafetyFilter}
          style={{
            backgroundColor: `rgba(251, 191, 36, ${0.05 + (warmth / 100) * 0.25})`,
            filter: `brightness(${brightness}%)`,
          }}
        />
      )}

      <ReaderToolbar
        title={book?.title || "Book"}
        author={book?.author || "Author"}
        currentPage={currentPage}
        totalPages={totalPages}
        zoomLevel={zoomLevel}
        theme={theme}
        focusMode={focusMode}
        eyeSafetyMode={eyeSafetyMode}
        isBookmarked={isCurrentPageBookmarked}
        readingMinutes={readingMinutes}
        notesCount={notes.length}
        highlightsCount={highlights.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onPageChange={setPage}
        onZoomChange={updateZoom}
        onThemeChange={updateTheme}
        onToggleFocusMode={toggleFocusMode}
        onToggleEyeSafetyMode={toggleEyeSafetyMode}
        onOpenEyeSafetySettings={() => setIsEyeSafetyPopoverOpen((prev) => !prev)}
        onToggleBookmark={handleToggleBookmark}
        onOpenNotes={() => {
          setSidebarTab("notes");
          setIsSidebarOpen(true);
        }}
        onOpenSearch={() => {
          setSidebarTab("search");
          setIsSidebarOpen(true);
        }}
        onOpenToc={() => {
          setSidebarTab("toc");
          setIsSidebarOpen(true);
        }}
        onFitWidth={() => updateZoom(1.25)}
        onFitPage={() => updateZoom(1.0)}
      />

      {/* Floating Eye-Safety Configuration Popover */}
      <EyeSafetyPopover
        isOpen={isEyeSafetyPopoverOpen}
        onClose={() => setIsEyeSafetyPopoverOpen(false)}
        eyeSafetyMode={eyeSafetyMode}
        onToggleEyeSafety={toggleEyeSafetyMode}
        warmth={warmth}
        onWarmthChange={setWarmth}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        breakIntervalMinutes={breakIntervalMinutes}
        onBreakIntervalChange={setBreakIntervalMinutes}
      />

      {/* 20-20-20 Eye Break Reminder Toast */}
      {showBreakToast && (
        <ReadingBreakToast
          readingMinutes={readingMinutes}
          onDismiss={() => setShowBreakToast(false)}
          onTakeBreak={() => {
            setShowBreakToast(false);
            toggleFocusMode();
          }}
        />
      )}

      <main className={styles.readerContent} onMouseUp={handleMouseUp}>
        {isEpub ? (
          <DynamicEpubReader
            fileBlob={fileBlob}
            currentPage={currentPage}
            targetCfiOrHref={targetCfiOrHref}
            theme={theme}
            fontSize={fontSize}
            onPageChange={(p) => setPage(p)}
            onTotalPagesLoaded={(t) => setTotalPages(t)}
            onOutlineLoaded={(items) => setTocItems(items)}
            onBookReady={(b) => {
              epubBookRef.current = b;
            }}
            onTextSelected={handleEpubSelection}
          />
        ) : (
          <DynamicPdfReader
            fileBlob={fileBlob}
            currentPage={currentPage}
            zoomLevel={zoomLevel}
            onPageChange={(p) => setPage(p)}
            onTotalPagesLoaded={(t) => setTotalPages(t)}
            onOutlineLoaded={(items) => setTocItems(items)}
            onDocReady={(doc) => {
              pdfDocRef.current = doc;
            }}
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

      {/* Reader Sidebar with Notes, Highlights, Bookmarks, TOC, and Search */}
      <ReaderSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPage={currentPage}
        bookId={bookId}
        notes={notes}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onDeleteAttachment={handleDeleteNoteAttachment}
        highlights={highlights}
        onNavigateToPage={handleNavigateToPageOrTarget}
        onDeleteHighlight={handleDeleteHighlight}
        onAddAnnotation={handleAddAnnotation}
        onDeleteAnnotation={handleDeleteAnnotation}
        bookmarks={bookmarks}
        onAddBookmark={handleAddBookmarkWithLabel}
        onDeleteBookmark={handleDeleteBookmarkById}
        tocItems={tocItems}
        searchResults={searchResults}
        isSearching={isSearching}
        onSearch={handleSearch}
        activeTab={sidebarTab}
      />
    </div>
  );
}
