import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { TocItem } from "@/types";
import styles from "./PdfReader.module.css";

// Configure pdf.js worker
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PdfReaderProps {
  fileBlob: Blob;
  currentPage: number;
  zoomLevel: number;
  onTotalPagesLoaded: (total: number) => void;
  onPageChange: (newPage: number) => void;
  onOutlineLoaded?: (items: TocItem[]) => void;
  onDocReady?: (doc: pdfjsLib.PDFDocumentProxy) => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  fileBlob,
  currentPage,
  zoomLevel,
  onTotalPagesLoaded,
  onPageChange,
  onOutlineLoaded,
  onDocReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF Document from blob
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    async function loadPdf() {
      try {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          pdfDocRef.current = doc;
          onTotalPagesLoaded(doc.numPages);
          if (onDocReady) {
            onDocReady(doc);
          }

          // Extract Table of Contents outline if available
          try {
            const outline = await doc.getOutline();
            if (outline && outline.length > 0 && onOutlineLoaded) {
              const tocList: TocItem[] = [];
              for (const item of outline) {
                let pageNum = 1;
                if (item.dest) {
                  try {
                    let destRef: any = item.dest;
                    if (typeof destRef === "string") {
                      destRef = await doc.getDestination(destRef);
                    }
                    if (destRef && Array.isArray(destRef)) {
                      const pageIndex = await doc.getPageIndex(destRef[0]);
                      pageNum = pageIndex + 1;
                    } else if (destRef) {
                      const pageIndex = await doc.getPageIndex(destRef as any);
                      pageNum = pageIndex + 1;
                    }
                  } catch {
                    // Ignore dest failure
                  }
                }
                tocList.push({
                  title: item.title,
                  pageNumber: pageNum,
                });
              }
              if (!isCancelled) {
                onOutlineLoaded(tocList);
              }
            }
          } catch {
            // Outline not present
          }

          setIsLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Failed to load PDF:", err);
          setError(err?.message || "Failed to load PDF document");
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [fileBlob, onTotalPagesLoaded, onOutlineLoaded, onDocReady]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDocRef.current || isLoading) return;

    let isCancelled = false;

    async function renderPage() {
      try {
        const pageNumber = Math.max(1, Math.min(currentPage, pdfDocRef.current!.numPages));
        const page = await pdfDocRef.current!.getPage(pageNumber);

        if (isCancelled) return;

        // Cancel previous rendering if in progress
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignore cancel error
          }
          renderTaskRef.current = null;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: zoomLevel });

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Error rendering PDF page:", err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, [currentPage, zoomLevel, isLoading]);

  if (isLoading) {
    return (
      <div className={styles.loadingOverlay}>
        <div className={styles.spinner} />
        <p>Loading document...</p>
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
    <div className={styles.pdfContainer} ref={containerRef}>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} className={styles.pdfCanvas} />
      </div>
    </div>
  );
};
