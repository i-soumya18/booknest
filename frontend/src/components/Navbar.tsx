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
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-surface)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0.85rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "1.25rem",
            fontWeight: "800",
            color: "var(--text-primary)",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>📚</span>
          <span>BookNest</span>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/books"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            My Books
          </Link>
          <Link
            href="/shelves"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            Shelves
          </Link>
          <Link
            href="/borrowed"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            Borrowed
          </Link>
          <Link
            href="/activity"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            Activity
          </Link>
        </nav>

        {/* User Auth Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "#3b82f615",
                  border: "1px solid #3b82f630",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  color: "#3b82f6",
                  fontWeight: 600,
                }}
              >
                <span>👤</span>
                <span>{user.name}</span>
              </div>
              <button
                onClick={() => logout()}
                style={{
                  padding: "0.4rem 0.85rem",
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => handleDemoLogin("alice@example.com")}
                disabled={submitting}
                style={{
                  padding: "0.4rem 0.8rem",
                  background: "var(--accent-color)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Demo: Alice (Owner)
              </button>
              <button
                onClick={() => handleDemoLogin("bob@example.com")}
                disabled={submitting}
                style={{
                  padding: "0.4rem 0.8rem",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
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
