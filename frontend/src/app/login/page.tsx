import { Suspense } from "react";
import { AuthCard } from "@/features/auth";
import { Spinner } from "@/components/ui";

export const metadata = {
  title: "Sign In — BookNest",
  description: "Sign in to your BookNest account",
};

export default function LoginPage() {
  return (
    <div className="page-container" style={{ minHeight: "75vh", display: "flex", alignItems: "center" }}>
      <Suspense
        fallback={
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Spinner size="lg" />
          </div>
        }
      >
        <AuthCard initialMode="login" />
      </Suspense>
    </div>
  );
}

