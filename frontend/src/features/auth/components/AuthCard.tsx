"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../AuthContext";
import { evaluatePassword, validateEmail, validateName } from "@/lib/validation/auth";
import { Spinner, ErrorBanner } from "@/components/ui";

interface AuthCardProps {
  initialMode?: "login" | "signup";
}

export function AuthCard({ initialMode = "login" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const { user, loading: authLoading, login, signup } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Sync mode if initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirectPath);
    }
  }, [user, authLoading, router, redirectPath]);

  const passwordRules = evaluatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const emailCheck = validateEmail(email);
  const nameCheck = validateName(name);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!emailCheck.isValid) {
      setError(emailCheck.error || "Please enter a valid email address");
      return;
    }

    if (mode === "signup") {
      if (!nameCheck.isValid) {
        setError(nameCheck.error || "Please provide your name");
        return;
      }

      if (!passwordRules.isValid) {
        setError("Password does not meet all security policy requirements");
        return;
      }

      if (!passwordsMatch) {
        setError("Passwords do not match");
        return;
      }
    } else {
      if (!password) {
        setError("Password is required");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password, name.trim());
      }
      router.push(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async (demoEmail: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(demoEmail, "Password123!");
      router.push(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "2rem auto", padding: "0 var(--space-4)" }}>
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-3)",
            fontSize: "var(--font-size-h2)",
            fontWeight: "700",
            color: "var(--color-text-tertiary)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ fontSize: "1.8rem", filter: "drop-shadow(0 0 10px rgba(0, 194, 255, 0.4))" }}>📚</span>
          <span>Book<span style={{ color: "var(--color-accent-primary)" }}>Nest</span></span>
        </Link>
        <p style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-3xl)", marginTop: "var(--space-2)" }}>
          {mode === "login" ? "Welcome back! Sign in to your account." : "Create your personal reading library."}
        </p>
      </div>

      {/* Main Auth Card */}
      <div
        className="design-card"
        style={{
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-3)",
        }}
      >
        {/* Mode Selector Tabs */}
        <div
          role="tablist"
          style={{
            display: "flex",
            background: "var(--color-surface-base)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-muted)",
            marginBottom: "var(--space-6)",
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: mode === "login" ? "var(--color-surface-raised)" : "transparent",
              color: mode === "login" ? "var(--color-accent-primary)" : "var(--color-text-primary)",
              fontWeight: mode === "login" ? 700 : 500,
              fontSize: "var(--font-size-2xl)",
              cursor: "pointer",
              transition: "all var(--motion-fast)",
              boxShadow: mode === "login" ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "none",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: mode === "signup" ? "var(--color-surface-raised)" : "transparent",
              color: mode === "signup" ? "var(--color-accent-primary)" : "var(--color-text-primary)",
              fontWeight: mode === "signup" ? 700 : 500,
              fontSize: "var(--font-size-2xl)",
              cursor: "pointer",
              transition: "all var(--motion-fast)",
              boxShadow: mode === "signup" ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "none",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <ErrorBanner message={error} />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Name Field (Sign Up only) */}
          {mode === "signup" && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <label htmlFor="auth-name" className="form-label">
                Full Name <span style={{ color: "var(--color-accent-primary)" }}>*</span>
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Jane Austen"
                disabled={submitting}
                className={`input-field ${touched.name && !nameCheck.isValid ? "error" : ""}`}
                aria-required="true"
                aria-invalid={touched.name && !nameCheck.isValid}
                autoComplete="name"
              />
              {touched.name && !nameCheck.isValid && (
                <p className="form-error" role="alert">
                  {nameCheck.error}
                </p>
              )}
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label htmlFor="auth-email" className="form-label">
              Email Address <span style={{ color: "var(--color-accent-primary)" }}>*</span>
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder="you@example.com"
              disabled={submitting}
              className={`input-field ${touched.email && !emailCheck.isValid ? "error" : ""}`}
              aria-required="true"
              aria-invalid={touched.email && !emailCheck.isValid}
              autoComplete="email"
            />
            {touched.email && !emailCheck.isValid && (
              <p className="form-error" role="alert">
                {emailCheck.error}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <label htmlFor="auth-password" className="form-label" style={{ marginBottom: 0 }}>
                Password <span style={{ color: "var(--color-accent-primary)" }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-secondary)",
                  fontSize: "var(--font-size-xl)",
                  cursor: "pointer",
                  padding: "0 var(--space-1)",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur("password")}
              placeholder="••••••••"
              disabled={submitting}
              className={`input-field ${touched.password && mode === "signup" && !passwordRules.isValid ? "error" : ""}`}
              aria-required="true"
              aria-invalid={touched.password && mode === "signup" && !passwordRules.isValid}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {/* Confirm Password Field (Sign Up only) */}
          {mode === "signup" && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <label htmlFor="auth-confirm-password" className="form-label">
                Confirm Password <span style={{ color: "var(--color-accent-primary)" }}>*</span>
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                placeholder="••••••••"
                disabled={submitting}
                className={`input-field ${touched.confirmPassword && !passwordsMatch ? "error" : ""}`}
                aria-required="true"
                aria-invalid={touched.confirmPassword && !passwordsMatch}
                autoComplete="new-password"
              />
              {touched.confirmPassword && !passwordsMatch && (
                <p className="form-error" role="alert">
                  Passwords do not match
                </p>
              )}
            </div>
          )}

          {/* Password Requirements Checklist (Sign Up only) */}
          {mode === "signup" && (
            <div
              style={{
                background: "var(--color-surface-base)",
                border: "1px solid var(--color-border-muted)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                marginBottom: "var(--space-5)",
                fontSize: "var(--font-size-xl)",
              }}
            >
              <p style={{ fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
                Password Security Requirements:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                <RequirementItem label="8+ characters" met={passwordRules.minLength} />
                <RequirementItem label="Uppercase letter" met={passwordRules.hasUppercase} />
                <RequirementItem label="Lowercase letter" met={passwordRules.hasLowercase} />
                <RequirementItem label="Number (0-9)" met={passwordRules.hasDigit} />
                <RequirementItem label="Special char (!@#$...)" met={passwordRules.hasSpecial} />
                <RequirementItem label="Passwords match" met={passwordsMatch} />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "var(--space-4)", fontSize: "var(--font-size-3xl)" }}
          >
            {submitting && <Spinner />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "var(--space-6) 0 var(--space-4) 0",
            color: "var(--color-text-inverse)",
            fontSize: "var(--font-size-xl)",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--color-border-muted)" }} />
          <span style={{ padding: "0 var(--space-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Or use demo accounts
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--color-border-muted)" }} />
        </div>

        {/* Demo Account Quick Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <button
            type="button"
            onClick={() => handleDemoSignIn("alice@example.com")}
            disabled={submitting}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: "space-between", padding: "var(--space-2) var(--space-4)" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span>👤</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-tertiary)" }}>Alice Owner</span>
              <span style={{ color: "var(--color-text-inverse)", fontSize: "var(--font-size-lg)" }}>alice@example.com</span>
            </span>
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-accent-bg)",
                color: "var(--color-accent-primary)",
                fontWeight: 700,
              }}
            >
              OWNER
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoSignIn("bob@example.com")}
            disabled={submitting}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: "space-between", padding: "var(--space-2) var(--space-4)" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span>👤</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-tertiary)" }}>Bob Borrower</span>
              <span style={{ color: "var(--color-text-inverse)", fontSize: "var(--font-size-lg)" }}>bob@example.com</span>
            </span>
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--color-success)",
                fontWeight: 700,
              }}
            >
              EDITOR / BORROWER
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoSignIn("charlie@example.com")}
            disabled={submitting}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: "space-between", padding: "var(--space-2) var(--space-4)" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span>👤</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-tertiary)" }}>Charlie Viewer</span>
              <span style={{ color: "var(--color-text-inverse)", fontSize: "var(--font-size-lg)" }}>charlie@example.com</span>
            </span>
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--color-warning)",
                fontWeight: 700,
              }}
            >
              VIEWER
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RequirementItem({ label, met }: { label: string; met: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        color: met ? "var(--color-success)" : "var(--color-text-inverse)",
        transition: "color var(--motion-fast)",
      }}
    >
      <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
        {met ? "✓" : "○"}
      </span>
      <span>{label}</span>
    </div>
  );
}
