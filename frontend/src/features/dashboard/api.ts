import { fetchApi } from "@/lib/api/client";
import { ActivityEvent } from "@/types";

export interface ShelfHighlight {
  id: string;
  name: string;
  book_count: number;
}

export interface DashboardMetrics {
  books_by_status: Record<string, number>;
  books_finished_this_year: number;
  average_rating: number | null;
  shelf_with_most_books: ShelfHighlight | null;
  books_currently_lent_out: number;
  shelves_shared_with_user: number;
  recent_activity: ActivityEvent[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return fetchApi<DashboardMetrics>("/api/v1/dashboard");
}
