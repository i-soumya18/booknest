import { BookList } from "@/features/books";

export default function BooksPage() {
  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
      <BookList />
    </main>
  );
}
