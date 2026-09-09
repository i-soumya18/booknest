import React, { useEffect, useRef, useState } from "react";
import ePub, { Book, Rendition } from "epubjs";
import styles from "./EpubReader.module.css";
import { ReaderTheme } from "@/types";

interface EpubReaderProps {
  fileBlob: Blob;
  currentPage: number;
  currentPosition?: string | null;
  theme: ReaderTheme;
  fontSize: number;
  onPageChange: (newPage: number, cfi?: string) => void;
  onTotalPagesLoaded: (total: number) => void;
}

export const EpubReader: React.FC<EpubReaderProps> = ({
  fileBlob,
  currentPage,
  currentPosition,
  theme,
  fontSize,
  onPageChange,
  onTotalPagesLoaded,
}) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const onPageChangeRef = useRef(onPageChange);
  const onTotalPagesLoadedRef = useRef(onTotalPagesLoaded);
  const currentPositionRef = useRef(currentPosition);
  const themeRef = useRef(theme);
  const fontSizeRef = useRef(fontSize);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
    onTotalPagesLoadedRef.current = onTotalPagesLoaded;
    currentPositionRef.current = currentPosition;
    themeRef.current = theme;
    fontSizeRef.current = fontSize;
  }, [onPageChange, onTotalPagesLoaded, currentPosition, theme, fontSize]);

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
