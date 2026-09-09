import { useCallback, useEffect, useRef, useState } from "react";
import {
  getReaderState,
  sendReaderProgressKeepAlive,
  updateReaderProgress,
} from "../api/readerApi";
import { ReaderProgressUpdate, ReaderState, ReaderTheme } from "@/types";

interface UseReaderProgressOptions {
  bookId: string;
  totalPages?: number;
  initialPage?: number;
  onPageChange?: (newPage: number) => void;
}

export function useReaderProgress({
  bookId,
  totalPages = 1,
  initialPage = 1,
  onPageChange,
}: UseReaderProgressOptions) {
  const [readerState, setReaderState] = useState<ReaderState | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [fontSize, setFontSize] = useState<number>(16);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [eyeSafetyMode, setEyeSafetyMode] = useState<boolean>(false);
  const [isLoadingState, setIsLoadingState] = useState<boolean>(true);

  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  // Track pending updates for debouncing
  const pendingUpdateRef = useRef<ReaderProgressUpdate | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Load initial reader state from backend
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    async function loadState() {
      try {
        setIsLoadingState(true);
        const state = await getReaderState(bookId);
        if (!isCancelled && state) {
          setReaderState(state);
          setCurrentPage(state.current_page || 1);
          setZoomLevel(state.zoom_level || 1.0);
          setTheme(state.theme || "light");
          setFontSize(state.font_size || 16);
          setFocusMode(state.focus_mode || false);
          setEyeSafetyMode(state.eye_safety_mode || false);
          if (onPageChangeRef.current && state.current_page) {
            onPageChangeRef.current(state.current_page);
          }
        }
      } catch (err) {
        console.error("Failed to load reader state:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingState(false);
        }
      }
    }

    if (bookId) {
      loadState();
    }

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, [bookId]);

  // Flush pending update immediately to server
  const flushProgress = useCallback(
    async (immediatePayload?: ReaderProgressUpdate) => {
      const payload = immediatePayload || pendingUpdateRef.current;
      if (!payload || !bookId) return;

      pendingUpdateRef.current = null;
      lastSavedTimeRef.current = Date.now();

      try {
        const updated = await updateReaderProgress(bookId, payload);
        if (isMountedRef.current) {
          setReaderState(updated);
        }
      } catch (err) {
        console.error("Failed to save reader progress:", err);
      }
    },
    [bookId]
  );

  // Queue an update with 5-second debounce
  const queueUpdate = useCallback(
    (update: ReaderProgressUpdate, immediate = false) => {
      pendingUpdateRef.current = {
        ...(pendingUpdateRef.current || {}),
        ...update,
      };

      if (immediate) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        flushProgress();
        return;
      }

      const now = Date.now();
      const elapsed = now - lastSavedTimeRef.current;

      if (elapsed >= 5000) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        flushProgress();
      } else if (!debounceTimerRef.current) {
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          flushProgress();
        }, 5000 - elapsed);
      }
    },
    [flushProgress]
  );

  // Change page
  const setPage = useCallback(
    (pageNumber: number) => {
      const clamped = Math.max(1, Math.min(pageNumber, totalPages || 1));
      setCurrentPage(clamped);
      if (onPageChange) {
        onPageChange(clamped);
      }
      queueUpdate({ current_page: clamped }, false);
    },
    [totalPages, onPageChange, queueUpdate]
  );

  // Update zoom
  const updateZoom = useCallback(
    (zoom: number) => {
      const clamped = Math.max(0.2, Math.min(zoom, 4.0));
      setZoomLevel(clamped);
      queueUpdate({ zoom_level: clamped }, false);
    },
    [queueUpdate]
  );

  // Update theme
  const updateTheme = useCallback(
    (newTheme: ReaderTheme) => {
      setTheme(newTheme);
      queueUpdate({ theme: newTheme }, true);
    },
    [queueUpdate]
  );

  // Toggle focus mode
  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      queueUpdate({ focus_mode: next }, true);
      return next;
    });
  }, [queueUpdate]);

  // Toggle eye safety mode
  const toggleEyeSafetyMode = useCallback(() => {
    setEyeSafetyMode((prev) => {
      const next = !prev;
      queueUpdate({ eye_safety_mode: next }, true);
      return next;
    });
  }, [queueUpdate]);

  // Update font size
  const updateFontSize = useCallback(
    (size: number) => {
      const clamped = Math.max(10, Math.min(size, 40));
      setFontSize(clamped);
      queueUpdate({ font_size: clamped }, false);
    },
    [queueUpdate]
  );

  // Save on window close / page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingUpdateRef.current && bookId) {
        sendReaderProgressKeepAlive(bookId, pendingUpdateRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pendingUpdateRef.current && bookId) {
        sendReaderProgressKeepAlive(bookId, pendingUpdateRef.current);
      }
    };
  }, [bookId]);

  return {
    readerState,
    currentPage,
    zoomLevel,
    theme,
    fontSize,
    focusMode,
    eyeSafetyMode,
    isLoadingState,
    setPage,
    updateZoom,
    updateTheme,
    updateFontSize,
    toggleFocusMode,
    toggleEyeSafetyMode,
    flushProgress,
  };
}
