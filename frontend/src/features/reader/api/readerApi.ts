import { fetchApi, fetchBlob, sendKeepAlivePatch } from "@/lib/api/client";
import { Book, ReaderProgressUpdate, ReaderState } from "@/types";

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
