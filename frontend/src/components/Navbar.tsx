"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/features/auth";

export function Navbar() {
  const { user, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDemoLogin = async (demoEmail: string) => {
    setAuthError(null);
    setSubmitting(true);
    try {
      await login(demoEmail, "Password123!");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        // Sign up logic via context or api
        await login(email, password);
      } else {
        await login(email, password);
      }
      setShowAuthModal(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Auth action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <header
      style={{
        borderBottom: "1px solid var(--color-border-default)",
        background: "rgba(14, 45, 73, 0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "var(--space-5) var(--space-8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-8)",
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            fontSize: "var(--font-size-h3)",
            fontWeight: "700",
            color: "var(--color-text-tertiary)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ fontSize: "1.4rem", filter: "drop-shadow(0 0 8px rgba(0, 194, 255, 0.4))" }}>📚</span>
          <span>Book<span style={{ color: "var(--color-accent-primary)" }}>Nest</span></span>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: "flex", gap: "var(--space-7)", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              color: "var(--color-text-primary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "var(--font-size-4xl)",
              transition: "color var(--motion-fast)",
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/books"
            style={{
              color: "var(--color-text-primary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "var(--font-size-4xl)",
              transition: "color var(--motion-fast)",
            }}
          >
            My Books
          </Link>
          <Link
            href="/shelves"
            style={{
              color: "var(--color-text-primary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "var(--font-size-4xl)",
              transition: "color var(--motion-fast)",
            }}
          >
            Shelves
          </Link>
          <Link
            href="/borrowed"
            style={{
              color: "var(--color-text-primary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "var(--font-size-4xl)",
              transition: "color var(--motion-fast)",
            }}
          >
            Borrowed
          </Link>
          <Link
            href="/activity"
            style={{
              color: "var(--color-text-primary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "var(--font-size-4xl)",
              transition: "color var(--motion-fast)",
            }}
          >
            Activity
          </Link>
        </nav>

        {/* User Auth Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  background: "var(--color-accent-bg)",
                  border: "1px solid var(--color-border-muted)",
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--font-size-2xl)",
                  color: "var(--color-text-tertiary)",
                  fontWeight: 600,
                }}
              >
                <span style={{ color: "var(--color-accent-primary)" }}>👤</span>
                <span>{user.name}</span>
              </div>
              <button
                onClick={() => logout()}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  background: "transparent",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-2xl)",
                  transition: "all var(--motion-fast)",
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <button
                onClick={() => handleDemoLogin("alice@example.com")}
                disabled={submitting}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  background: "linear-gradient(135deg, #00c2ff 0%, #0070f3 100%)",
                  color: "#000000",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-2)",
                  transition: "all var(--motion-fast)",
                }}
              >
                Demo: Alice (Owner)
              </button>
              <button
                onClick={() => handleDemoLogin("bob@example.com")}
                disabled={submitting}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--color-surface-muted)",
                  color: "var(--color-text-tertiary)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all var(--motion-fast)",
                }}
              >
                Demo: Bob (Borrower)
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
