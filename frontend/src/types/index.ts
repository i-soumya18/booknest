// TypeScript interfaces for domain entities

export type BookStatus = "WANT_TO_READ" | "READING" | "FINISHED";
export type BookSortBy = "created_at" | "title" | "rating";
export type SortOrder = "asc" | "desc";

export interface BookFile {
  id: string;
  bookId?: string;
  book_id?: string;
  originalName?: string;
  original_name?: string;
  storedPath?: string;
  stored_path?: string;
  mimeType?: string;
  mime_type?: string;
  fileSizeBytes?: number;
  file_size_bytes?: number;
  pageCount?: number | null;
  page_count?: number | null;
  coverThumbnail?: string | null;
  cover_thumbnail?: string | null;
  checksumSha256?: string | null;
  checksum_sha256?: string | null;
  createdAt?: string;
  created_at?: string;
}

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
  file?: BookFile | null;
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
  userId?: string;
  user_id?: string;
  email: string;
  name: string;
  role: ShelfRole;
  createdAt?: string;
  created_at?: string;
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

export type ReaderTheme = "light" | "dark" | "sepia" | "custom";

export interface ReaderState {
  id: string;
  book_id: string;
  user_id: string;
  current_page: number;
  current_position?: string | null;
  scroll_position?: number | null;
  zoom_level: number;
  theme: ReaderTheme;
  font_size: number;
  focus_mode: boolean;
  eye_safety_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReaderProgressUpdate {
  current_page?: number;
  current_position?: string | null;
  scroll_position?: number | null;
  zoom_level?: number;
  theme?: ReaderTheme;
  font_size?: number;
  focus_mode?: boolean;
  eye_safety_mode?: boolean;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple";

export interface Annotation {
  id: string;
  highlight_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  book_id: string;
  user_id: string;
  page_number: number;
  cfi_range?: string | null;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  color: HighlightColor;
  created_at: string;
  updated_at: string;
  annotations: Annotation[];
}

export interface Bookmark {
  id: string;
  book_id: string;
  user_id: string;
  page_number: number;
  label?: string | null;
  created_at: string;
}

export interface TocItem {
  title: string;
  pageNumber?: number;
  href?: string;
  subitems?: TocItem[];
}

export interface SearchResult {
  pageNumber: number;
  snippet: string;
  cfi?: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  attachment_type: "image" | "audio";
  original_name: string;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds?: number | null;
  created_at: string;
}

export interface ReaderNote {
  id: string;
  book_id: string;
  user_id: string;
  page_number?: number | null;
  highlight_id?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  attachments: NoteAttachment[];
}

