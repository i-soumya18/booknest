"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/features/auth";
import { Spinner } from "@/components/ui";

export function Navbar() {
  const { user, login, logout } = useAuth();
  const pathname = usePathname();
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDemoLogin = async (demoEmail: string) => {
    setAuthError(null);
    setSubmitting(true);
    try {
      await login(demoEmail, "Password123!");
      setMobileOpen(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/books", label: "My Books" },
    { href: "/shelves", label: "Shelves" },
    { href: "/borrowed", label: "Borrowed" },
    { href: "/activity", label: "Activity" },
  ];

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
          padding: "var(--space-4) var(--space-8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-6)",
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

        {/* Desktop Nav Links */}
        <nav className="nav-desktop-links" style={{ display: "flex", gap: "var(--space-7)", alignItems: "center" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                style={{
                  color: isActive ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                  textDecoration: "none",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "var(--font-size-4xl)",
                  transition: "color var(--motion-fast)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop User Auth Section */}
        <div className="nav-desktop-auth" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {authError && (
            <span style={{ color: "var(--color-error)", fontSize: "var(--font-size-xl)", marginRight: "var(--space-2)" }}>
              {authError}
            </span>
          )}
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
                className="btn btn-ghost btn-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <button
                onClick={() => handleDemoLogin("alice@example.com")}
                disabled={submitting}
                className="btn btn-primary btn-sm"
              >
                {submitting ? <Spinner /> : null} Demo: Alice (Owner)
              </button>
              <button
                onClick={() => handleDemoLogin("bob@example.com")}
                disabled={submitting}
                className="btn btn-secondary btn-sm"
              >
                {submitting ? <Spinner /> : null} Demo: Bob (Borrower)
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="nav-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation Menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`nav-mobile-menu ${mobileOpen ? "open" : ""}`}>
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                color: isActive ? "var(--color-accent-primary)" : "var(--color-text-tertiary)",
                fontSize: "var(--font-size-2xl)",
                fontWeight: isActive ? 700 : 500,
                padding: "var(--space-2) 0",
              }}
            >
              {link.label}
            </Link>
          );
        })}

        <div style={{ borderTop: "1px solid var(--color-border-default)", paddingTop: "var(--space-4)", marginTop: "var(--space-2)" }}>
          {authError && (
            <p style={{ color: "var(--color-error)", fontSize: "var(--font-size-xl)", marginBottom: "var(--space-2)" }}>
              {authError}
            </p>
          )}
          {user ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-2xl)" }}>
                👤 {user.name}
              </span>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="btn btn-ghost btn-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <button
                onClick={() => handleDemoLogin("alice@example.com")}
                disabled={submitting}
                className="btn btn-primary btn-sm"
              >
                {submitting ? <Spinner /> : null} Sign in as Alice (Owner)
              </button>
              <button
                onClick={() => handleDemoLogin("bob@example.com")}
                disabled={submitting}
                className="btn btn-secondary btn-sm"
              >
                {submitting ? <Spinner /> : null} Sign in as Bob (Borrower)
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
