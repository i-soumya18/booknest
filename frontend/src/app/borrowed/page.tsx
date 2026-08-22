import { BorrowedBookList } from "@/features/lending";

export default function BorrowedPage() {
  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
      <BorrowedBookList />
    </main>
  );
}
