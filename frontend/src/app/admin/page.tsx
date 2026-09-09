"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth";
import { Spinner } from "@/components/ui";
import { AdminAnalyticsTab } from "@/features/admin/components/AdminAnalyticsTab";
import { AdminUsersTab } from "@/features/admin/components/AdminUsersTab";
import { AdminModerationTab } from "@/features/admin/components/AdminModerationTab";
import { AdminSettingsTab } from "@/features/admin/components/AdminSettingsTab";
import { AdminAuditLogTab } from "@/features/admin/components/AdminAuditLogTab";

const ADMIN_EMAIL = "sahoosoumya242004@gmail.com";

type AdminTab = "analytics" | "users" | "moderation" | "settings" | "audit-log";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("analytics");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Spinner />
      </div>
    );
  }

  const isAdmin = Boolean(user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (!isAdmin) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "65vh",
          padding: "1rem",
        }}
      >
        <div
          className="design-card"
          style={{
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            padding: "2.5rem 1.5rem",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🛡️🚫</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f87171", margin: "0 0 0.5rem 0" }}>
            403 — Admin Privileges Required
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            Access to the BookNest Control Panel is strictly restricted to authorized administrators.
            {user ? ` Your account (${user.email}) does not have administrative rights.` : " You must sign in with the admin account to access this page."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/" className="btn btn-secondary btn-sm">
              Return to Dashboard
            </Link>
            {!user && (
              <Link href="/login" className="btn btn-primary btn-sm">
                Sign In as Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "users", label: "Users & Access", icon: "👥" },
    { id: "moderation", label: "File Moderation", icon: "📁" },
    { id: "settings", label: "System Settings", icon: "⚙️" },
    { id: "audit-log", label: "Audit Log", icon: "📜" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "3rem" }}>
      {/* Admin Header Banner */}
      <div
        className="design-card"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          padding: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            🛡️
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>
              BookNest Control Panel
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "2px 0 0 0" }}>
              Platform operations, system configuration, user access control, and telemetry.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            ● Super Admin Active
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--color-border-default)",
          paddingBottom: "4px",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-ghost btn-sm"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                background: isActive ? "rgba(56, 189, 248, 0.15)" : "transparent",
                color: isActive ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? "2px solid var(--color-accent-primary)" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panes */}
      <div style={{ marginTop: "0.5rem" }}>
        {activeTab === "analytics" && <AdminAnalyticsTab />}
        {activeTab === "users" && <AdminUsersTab />}
        {activeTab === "moderation" && <AdminModerationTab />}
        {activeTab === "settings" && <AdminSettingsTab />}
        {activeTab === "audit-log" && <AdminAuditLogTab />}
      </div>
    </div>
  );
}
