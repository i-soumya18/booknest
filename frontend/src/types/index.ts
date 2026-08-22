// TypeScript interfaces for domain entities

export type BookStatus = "WANT_TO_READ" | "READING" | "FINISHED";
export type BookSortBy = "created_at" | "title" | "rating";
export type SortOrder = "asc" | "desc";

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

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BookQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BookStatus | "";
  sortBy?: BookSortBy;
  sortOrder?: SortOrder;
}

export type ShelfRole = "OWNER" | "EDITOR" | "VIEWER";

export interface Shelf {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  userRole?: ShelfRole;
}

export interface ShelfDetail extends Shelf {
  books: Book[];
}

export interface Collaborator {
  userId: string;
  email: string;
  name: string;
  role: ShelfRole;
  createdAt: string;
}
