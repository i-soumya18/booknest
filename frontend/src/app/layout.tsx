import "./globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth";
import { ToastProvider } from "@/components/ui";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "BookNest — Production Reading Tracker",
  description: "Enterprise reading tracker featuring custom shelf RBAC, real-time WebSockets, atomic page progress tracking, and lending concurrency controls.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="page-container">
              {children}
            </main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

