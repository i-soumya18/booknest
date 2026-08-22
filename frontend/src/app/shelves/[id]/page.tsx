import { ShelfDetailView } from "@/features/shelves";

interface PageProps {
  params: {
    id: string;
  };
}

export default function ShelfDetailPage({ params }: PageProps) {
  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
      <ShelfDetailView shelfId={params.id} />
    </main>
  );
}
