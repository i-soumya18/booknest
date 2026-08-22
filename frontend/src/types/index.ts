// TypeScript interfaces for domain entities

export type BookStatus = "WANT_TO_READ" | "READING" | "FINISHED";

export interface Book {
  id: string;
  ownerId: string;
  title: string;
  author: string;
  status: BookStatus;
  totalPages: number;
  currentPage: number;
  rating?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
}

export type ShelfRole = "OWNER" | "EDITOR" | "VIEWER";

export interface Shelf {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}
