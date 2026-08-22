import { fetchApi } from "@/lib/api/client";
import { BorrowedBook, LendBookRequest, Lending, PaginatedResponse } from "@/types";

export async function lendBook(bookId: string, data: LendBookRequest): Promise<Lending> {
  return fetchApi<Lending>(`/api/v1/books/${bookId}/lend`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function returnBook(bookId: string): Promise<Lending> {
  return fetchApi<Lending>(`/api/v1/books/${bookId}/return`, {
    method: "POST",
  });
}

export async function getBorrowedBooks(
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<BorrowedBook>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  return fetchApi<PaginatedResponse<BorrowedBook>>(`/api/v1/borrowed?${params.toString()}`);
}
