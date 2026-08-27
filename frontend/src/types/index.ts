// TypeScript interfaces for domain entities

export type BookStatus = "WANT_TO_READ" | "READING" | "FINISHED";
export type BookSortBy = "created_at" | "title" | "rating";
export type SortOrder = "asc" | "desc";

export interface Book {
  id: string;
  ownerId?: string;
  owner_id?: string;
  title: string;
  author: string;
  status: BookStatus;
  totalPages?: number;
  total_pages?: number;
  currentPage?: number;
  current_page?: number;
  rating?: number | null;
  notes?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  finishedAt?: string | null;
  finished_at?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  page_size?: number;
  total: number;
  totalPages: number;
  total_pages?: number;
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

export interface Lending {
  id: string;
  bookId: string;
  ownerId: string;
  borrowerId: string;
  borrowedAt: string;
  dueAt?: string | null;
  returnedAt?: string | null;
}

export interface BorrowedBook {
  lendingId: string;
  book: Book;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  borrowedAt: string;
  dueAt?: string | null;
}

export interface LendBookRequest {
  borrower_email?: string;
  borrower_id?: string;
  due_at?: string | null;
}

export interface ActivityEvent {
  id: string;
  user_id?: string;
  userId?: string;
  event_type?: string;
  eventType?: string;
  entity_type?: string;
  entityType?: string;
  entity_id?: string;
  entityId?: string;
  payload: Record<string, any>;
  created_at?: string;
  createdAt?: string;
}

