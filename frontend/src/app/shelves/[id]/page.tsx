import { ShelfDetailView } from "@/features/shelves";

interface PageProps {
  params: {
    id: string;
  };
}

export default function ShelfDetailPage({ params }: PageProps) {
  return <ShelfDetailView shelfId={params.id} />;
}
