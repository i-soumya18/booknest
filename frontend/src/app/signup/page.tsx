import { Suspense } from "react";
import { AuthCard } from "@/features/auth";
import { Spinner } from "@/components/ui";

export const metadata = {
  title: "Sign Up — BookNest",
  description: "Create your BookNest account and start tracking your reading",
};

export default function SignUpPage() {
  return (
    <div className="page-container" style={{ minHeight: "75vh", display: "flex", alignItems: "center" }}>
      <Suspense
        fallback={
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Spinner size="lg" />
          </div>
        }
      >
        <AuthCard initialMode="signup" />
      </Suspense>
    </div>
  );
}

