import React, { useEffect, useRef, useState } from "react";
import ePub, { Book, Rendition } from "epubjs";
import styles from "./EpubReader.module.css";
import { ReaderTheme, TocItem } from "@/types";

interface EpubReaderProps {
  fileBlob: Blob;
  currentPage: number;
  currentPosition?: string | null;
  targetCfiOrHref?: string | null;
  theme: ReaderTheme;
  fontSize: number;
  onPageChange: (newPage: number, cfi?: string) => void;
  onTotalPagesLoaded: (total: number) => void;
  onOutlineLoaded?: (items: TocItem[]) => void;
  onBookReady?: (book: Book, rendition: Rendition) => void;
  onTextSelected?: (text: string, x: number, y: number) => void;
}

export const EpubReader: React.FC<EpubReaderProps> = ({
  fileBlob,
  currentPage,
  currentPosition,
  targetCfiOrHref,
  theme,
  fontSize,
  onPageChange,
  onTotalPagesLoaded,
  onOutlineLoaded,
  onBookReady,
  onTextSelected,
}) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const onPageChangeRef = useRef(onPageChange);
  const onTotalPagesLoadedRef = useRef(onTotalPagesLoaded);
  const onOutlineLoadedRef = useRef(onOutlineLoaded);
  const onBookReadyRef = useRef(onBookReady);
  const onTextSelectedRef = useRef(onTextSelected);
  const currentPositionRef = useRef(currentPosition);
  const themeRef = useRef(theme);
  const fontSizeRef = useRef(fontSize);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
    onTotalPagesLoadedRef.current = onTotalPagesLoaded;
    onOutlineLoadedRef.current = onOutlineLoaded;
    onBookReadyRef.current = onBookReady;
    onTextSelectedRef.current = onTextSelected;
    currentPositionRef.current = currentPosition;
    themeRef.current = theme;
    fontSizeRef.current = fontSize;
  }, [onPageChange, onTotalPagesLoaded, onOutlineLoaded, onBookReady, onTextSelected, currentPosition, theme, fontSize]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize EPUB Book & Rendition
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    async function initEpub() {
      try {
        const buffer = await fileBlob.arrayBuffer();
        if (isCancelled || !viewerRef.current) return;

        const book = ePub(buffer);
        bookRef.current = book;

        await book.ready;

        if (isCancelled || !viewerRef.current) return;

        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
        });
        renditionRef.current = rendition;

        // Register themes
        rendition.themes.register("light", {
          body: {
            background: "#ffffff !important",
            color: "#1e293b !important",
          },
        });
        rendition.themes.register("dark", {
          body: {
            background: "#0f172a !important",
            color: "#f8fafc !important",
          },
        });
        rendition.themes.register("sepia", {
          body: {
            background: "#f4ecd8 !important",
            color: "#433422 !important",
          },
        });

        rendition.themes.select(themeRef.current);
        rendition.themes.fontSize(`${fontSizeRef.current}px`);

        // Load navigation / Table of Contents
        book.loaded.navigation.then((nav: any) => {
          if (!isCancelled && nav?.toc && onOutlineLoadedRef.current) {
            const flatten = (items: any[]): TocItem[] => {
              const res: TocItem[] = [];
              for (const it of items) {
                res.push({
                  title: it.label ? it.label.trim() : "Chapter",
                  href: it.href,
                });
                if (it.subitems && it.subitems.length > 0) {
                  res.push(...flatten(it.subitems));
                }
              }
              return res;
            };
            onOutlineLoadedRef.current(flatten(nav.toc));
          }
        });

        if (onBookReadyRef.current) {
          onBookReadyRef.current(book, rendition);
        }

        // Selection listener inside rendition iframe
        rendition.on("selected", (cfiRange: string, contents: any) => {
          if (onTextSelectedRef.current) {
            const selection = contents.window.getSelection();
            const text = selection?.toString()?.trim();
            if (text && text.length >= 2) {
              const range = selection?.getRangeAt(0);
              const rect = range?.getBoundingClientRect();
              if (rect) {
                onTextSelectedRef.current(text, rect.left + rect.width / 2, rect.top);
              }
            }
          }
        });

        // Generate locations for page numbers
        book.locations.generate(1000).then(() => {
          if (!isCancelled) {
            const locs = book.locations as any;
            const total = locs.total || (typeof locs.length === "function" ? locs.length() : 1);
            if (onTotalPagesLoadedRef.current) {
              onTotalPagesLoadedRef.current(total);
            }
          }
        });

        // Display saved position or first page
        const initialPos = currentPositionRef.current;
        if (initialPos) {
          await rendition.display(initialPos);
        } else {
          await rendition.display();
        }

        // Listen for page relocation
        rendition.on("relocated", (location: any) => {
          if (isCancelled) return;
          const cfi = location.start.cfi;
          const locs = book.locations as any;
          const page = locs.percentageFromCfi(cfi);
          const total = locs.total || (typeof locs.length === "function" ? locs.length() : 1);
          const calculatedPage = Math.max(1, Math.round(page * total));
          if (onPageChangeRef.current) {
            onPageChangeRef.current(calculatedPage, cfi);
          }
        });

        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Failed to load EPUB:", err);
          setError(err?.message || "Failed to load EPUB document");
          setIsLoading(false);
        }
      }
    }

    initEpub();

    return () => {
      isCancelled = true;
      if (renditionRef.current) {
        renditionRef.current.destroy();
        renditionRef.current = null;
      }
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
      }
    };
  }, [fileBlob]);

  // Apply theme changes dynamically
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
    }
  }, [theme]);

  // Apply font size changes dynamically
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}px`);
    }
  }, [fontSize]);

  // Jump to target CFI or href (from TOC or Search)
  useEffect(() => {
    if (targetCfiOrHref && renditionRef.current) {
      renditionRef.current.display(targetCfiOrHref);
    }
  }, [targetCfiOrHref]);

  const handlePrev = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  };

  const handleNext = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingOverlay}>
        <div className={styles.spinner} />
        <p>Opening EPUB book...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorOverlay}>
        <p>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.epubContainer}>
      <button
        className={styles.navArrowLeft}
        onClick={handlePrev}
        title="Previous Page"
        aria-label="Previous Page"
      >
        ←
      </button>

      <div className={styles.viewerWrapper} ref={viewerRef} />

      <button
        className={styles.navArrowRight}
        onClick={handleNext}
        title="Next Page"
        aria-label="Next Page"
      >
        →
      </button>
    </div>
  );
};
