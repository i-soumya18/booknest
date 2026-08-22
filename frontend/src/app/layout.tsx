import "./globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "BookNest — Production Reading Tracker",
  description: "Manage your books, custom shelves, lending, and real-time reading progress.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
