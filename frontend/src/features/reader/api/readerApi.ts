import { fetchApi, fetchBlob, sendKeepAlivePatch } from "@/lib/api/client";
import {
  Annotation,
  Book,
  Bookmark,
  Highlight,
  HighlightColor,
  NoteAttachment,
  ReaderNote,
  ReaderProgressUpdate,
  ReaderState,
} from "@/types";

export async function getReaderState(bookId: string): Promise<ReaderState> {
  return fetchApi<ReaderState>(`/api/v1/books/${bookId}/reader/state`);
}

export async function updateReaderProgress(
  bookId: string,
  data: ReaderProgressUpdate
): Promise<ReaderState> {
  return fetchApi<ReaderState>(`/api/v1/books/${bookId}/reader/progress`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getBookFileBlob(
  bookId: string
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  return fetchBlob(`/api/v1/books/${bookId}/file`);
}

export function sendReaderProgressKeepAlive(
  bookId: string,
  data: ReaderProgressUpdate
): void {
  sendKeepAlivePatch(`/api/v1/books/${bookId}/reader/progress`, data);
}

export async function getBookDetails(bookId: string): Promise<Book> {
  return fetchApi<Book>(`/api/v1/books/${bookId}`);
}

export async function getHighlights(bookId: string): Promise<Highlight[]> {
  return fetchApi<Highlight[]>(`/api/v1/books/${bookId}/highlights`);
}

export async function createHighlight(
  bookId: string,
  data: {
    page_number: number;
    selected_text: string;
    color: HighlightColor;
    start_offset?: number;
    end_offset?: number;
    cfi_range?: string | null;
  }
): Promise<Highlight> {
  return fetchApi<Highlight>(`/api/v1/books/${bookId}/highlights`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateHighlightColor(
  bookId: string,
  highlightId: string,
  color: HighlightColor
): Promise<Highlight> {
  return fetchApi<Highlight>(`/api/v1/books/${bookId}/highlights/${highlightId}`, {
    method: "PATCH",
    body: JSON.stringify({ color }),
  });
}

export async function deleteHighlight(
  bookId: string,
  highlightId: string
): Promise<void> {
  return fetchApi<void>(`/api/v1/books/${bookId}/highlights/${highlightId}`, {
    method: "DELETE",
  });
}

export async function addAnnotation(
  bookId: string,
  highlightId: string,
  content: string
): Promise<Annotation> {
  return fetchApi<Annotation>(
    `/api/v1/books/${bookId}/highlights/${highlightId}/annotations`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
}

export async function deleteAnnotation(
  bookId: string,
  highlightId: string,
  annotationId: string
): Promise<void> {
  return fetchApi<void>(
    `/api/v1/books/${bookId}/highlights/${highlightId}/annotations/${annotationId}`,
    {
      method: "DELETE",
    }
  );
}

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  return fetchApi<Bookmark[]>(`/api/v1/books/${bookId}/bookmarks`);
}

export async function createBookmark(
  bookId: string,
  pageOrData: number | { page_number: number; label?: string },
  label?: string
): Promise<Bookmark> {
  const payload =
    typeof pageOrData === "number"
      ? { page_number: pageOrData, label }
      : pageOrData;
  return fetchApi<Bookmark>(`/api/v1/books/${bookId}/bookmarks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteBookmark(
  bookId: string,
  bookmarkId: string
): Promise<void> {
  return fetchApi<void>(`/api/v1/books/${bookId}/bookmarks/${bookmarkId}`, {
    method: "DELETE",
  });
}

export async function getNotes(bookId: string): Promise<ReaderNote[]> {
  return fetchApi<ReaderNote[]>(`/api/v1/books/${bookId}/notes`);
}

export async function createNote(
  bookId: string,
  data: { page_number?: number | null; highlight_id?: string | null; content: string }
): Promise<ReaderNote> {
  return fetchApi<ReaderNote>(`/api/v1/books/${bookId}/notes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNote(
  bookId: string,
  noteId: string,
  data: { page_number?: number | null; content?: string }
): Promise<ReaderNote> {
  return fetchApi<ReaderNote>(`/api/v1/books/${bookId}/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteNote(bookId: string, noteId: string): Promise<void> {
  return fetchApi<void>(`/api/v1/books/${bookId}/notes/${noteId}`, {
    method: "DELETE",
  });
}

export async function uploadNoteAttachment(
  bookId: string,
  noteId: string,
  file: File | Blob,
  durationSeconds?: number,
  filename?: string
): Promise<NoteAttachment> {
  const formData = new FormData();
  formData.append("file", file, filename || (file as File).name || "attachment");
  if (durationSeconds !== undefined) {
    formData.append("duration_seconds", String(durationSeconds));
  }
  return fetchApi<NoteAttachment>(
    `/api/v1/books/${bookId}/notes/${noteId}/attachments`,
    {
      method: "POST",
      body: formData,
    }
  );
}

export async function deleteNoteAttachment(
  bookId: string,
  noteId: string,
  attachmentId: string
): Promise<void> {
  return fetchApi<void>(
    `/api/v1/books/${bookId}/notes/${noteId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    }
  );
}

export function getAttachmentUrl(
  bookId: string,
  noteId: string,
  attachmentId: string
): string {
  return `/api/v1/books/${bookId}/notes/${noteId}/attachments/${attachmentId}`;
}
