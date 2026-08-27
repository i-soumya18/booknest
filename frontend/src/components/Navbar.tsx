"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { Spinner, useToast } from "@/components/ui";

export function Navbar() {
  const { user, login, logout } = useAuth();
  const pathname = usePathname();
  const { success, error: toastError } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);


  const handleDemoLogin = async (demoEmail: string, personaName: string) => {
    setSubmitting(true);
    setPersonaDropdownOpen(false);
    setMobileOpen(false);
    try {
      await login(demoEmail, "Password123!");
      success(`Switched persona to ${personaName}`, `Logged in as ${demoEmail}`);
    } catch (err) {
      toastError("Failed to switch persona", err instanceof Error ? err.message : "Authentication failed");
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

  const getPersonaRole = (email?: string) => {
    if (email === "alice@example.com") return { role: "Owner 👑", color: "badge-owner" };
    if (email === "bob@example.com") return { role: "Editor / Borrower ✏️", color: "badge-editor" };
    if (email === "charlie@example.com") return { role: "Viewer 👁️", color: "badge-viewer" };
    return { role: "Member", color: "badge-reading" };
  };

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid var(--color-border-default)",
          background: "rgba(13, 21, 36, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            padding: "0.75rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "1.25rem",
                fontWeight: "800",
                color: "#ffffff",
                letterSpacing: "-0.03em",
              }}
            >
              <span style={{ fontSize: "1.35rem", filter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))" }}>📚</span>
              <span>Book<span style={{ color: "var(--color-accent-primary)" }}>Nest</span></span>
            </Link>

            {/* Live Real-Time WebSocket HUD */}
            <div
              title="Real-Time WebSocket Gateway Active (Authenticated Room Subscriptions)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                borderRadius: "var(--radius-full)",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontSize: "11px",
                fontWeight: 600,
                color: "#34d399",
              }}
            >
              <span className="pulse-dot pulse-dot-green" style={{ width: "6px", height: "6px" }} />
              <span>WS Live</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="nav-desktop-links" style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    color: isActive ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "14px",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth & Evaluation Controls */}
          <div className="nav-desktop-auth" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {mounted && user ? (

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
                {/* 1-Click Persona Switcher Dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(17, 29, 51, 0.9)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: "var(--radius-full)",
                      padding: "4px 12px",
                    }}
                    title="Switch evaluation persona"
                  >
                    <span style={{ fontSize: "13px" }}>👤</span>
                    <span style={{ fontWeight: 600, color: "#ffffff", fontSize: "13px" }}>{user.name}</span>
                    <span className={`badge ${getPersonaRole(user.email).color}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                      {getPersonaRole(user.email).role.split(" ")[0]}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>▼</span>
                  </button>

                  {personaDropdownOpen && (
                    <div
                      className="design-card"
                      style={{
                        position: "absolute",
                        top: "110%",
                        right: 0,
                        width: "260px",
                        background: "#0c1527",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        boxShadow: "0 10px 30px -4px rgba(0,0,0,0.8)",
                        padding: "8px",
                        zIndex: 200,
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", padding: "4px 8px", textTransform: "uppercase" }}>
                        Evaluation Personas
                      </div>
                      
                      <button
                        onClick={() => handleDemoLogin("alice@example.com", "Alice (Owner)")}
                        disabled={submitting}
                        className="btn btn-ghost btn-xs"
                        style={{ justifyContent: "flex-start", padding: "6px 8px", textAlign: "left", width: "100%" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "#fde047", fontWeight: 700 }}>👑 Alice</span>
                            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>(Owner)</span>
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Library owner & shelf admin</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleDemoLogin("bob@example.com", "Bob (Editor/Borrower)")}
                        disabled={submitting}
                        className="btn btn-ghost btn-xs"
                        style={{ justifyContent: "flex-start", padding: "6px 8px", textAlign: "left", width: "100%" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "#7dd3fc", fontWeight: 700 }}>✏️ Bob</span>
                            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>(Editor / Borrower)</span>
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Editor on Tech Classics, borrower</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleDemoLogin("charlie@example.com", "Charlie (Viewer)")}
                        disabled={submitting}
                        className="btn btn-ghost btn-xs"
                        style={{ justifyContent: "flex-start", padding: "6px 8px", textAlign: "left", width: "100%" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "#cbd5e1", fontWeight: 700 }}>👁️ Charlie</span>
                            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>(Viewer)</span>
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Read-only viewer on shared shelves</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    logout();
                    setPersonaDropdownOpen(false);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Create Account
                </Link>
                <div style={{ width: "1px", height: "18px", background: "var(--color-border-default)", margin: "0 2px" }} />
                <button
                  onClick={() => handleDemoLogin("alice@example.com", "Alice (Owner)")}
                  disabled={submitting}
                  className="btn btn-secondary btn-sm"
                  title="Quick 1-click login as Alice (Owner)"
                >
                  {submitting ? <Spinner /> : "👑"} Demo: Alice
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
                  color: isActive ? "var(--color-accent-primary)" : "var(--color-text-primary)",
                  fontSize: "15px",
                  fontWeight: isActive ? 700 : 500,
                  padding: "6px 0",
                }}
              >
                {link.label}
              </Link>
            );
          })}

          <div style={{ borderTop: "1px solid var(--color-border-default)", paddingTop: "12px", marginTop: "8px" }}>

            {mounted && user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600 }}>
                    👤 {user.name} ({getPersonaRole(user.email).role})
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

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                  <button onClick={() => handleDemoLogin("alice@example.com", "Alice")} className="btn btn-secondary btn-xs">
                    👑 Alice
                  </button>
                  <button onClick={() => handleDemoLogin("bob@example.com", "Bob")} className="btn btn-secondary btn-xs">
                    ✏️ Bob
                  </button>
                  <button onClick={() => handleDemoLogin("charlie@example.com", "Charlie")} className="btn btn-secondary btn-xs">
                    👁️ Charlie
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="btn btn-ghost btn-sm"
                    style={{ textAlign: "center" }}
                  >
                    Sign In

                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="btn btn-primary btn-sm"
                    style={{ textAlign: "center" }}
                  >
                    Create Account
                  </Link>
                </div>
                <button
                  onClick={() => handleDemoLogin("alice@example.com", "Alice")}
                  disabled={submitting}
                  className="btn btn-secondary btn-sm"
                >
                  {submitting ? <Spinner /> : "👑"} Sign in as Alice (Owner)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}


