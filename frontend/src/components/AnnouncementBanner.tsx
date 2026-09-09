"use client";

import { useEffect, useState } from "react";
import { getPublicAnnouncement } from "@/features/admin";

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAnnouncement() {
      try {
        const data = await getPublicAnnouncement();
        if (isMounted && data?.announcement && data.announcement.trim()) {
          const dismissedSaved = sessionStorage.getItem(`bn_dismissed_announcement_${data.announcement}`);
          if (!dismissedSaved) {
            setAnnouncement(data.announcement);
          }
        }
      } catch {
        // Silently ignore if announcement cannot be fetched
      }
    }
    loadAnnouncement();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!announcement || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`bn_dismissed_announcement_${announcement}`, "true");
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div
      role="region"
      aria-label="System Announcement"
      style={{
        background: "linear-gradient(90deg, rgba(30, 58, 138, 0.95), rgba(15, 23, 42, 0.98), rgba(14, 116, 144, 0.95))",
        borderBottom: "1px solid rgba(56, 189, 248, 0.3)",
        color: "#ffffff",
        padding: "0.5rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        fontSize: "13px",
        fontWeight: 500,
        zIndex: 110,
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
        <span style={{ fontSize: "15px" }}>📢</span>
        <span style={{ letterSpacing: "0.01em", color: "#f8fafc" }}>
          {announcement}
        </span>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255, 255, 255, 0.7)",
          cursor: "pointer",
          padding: "4px",
          fontSize: "14px",
          lineHeight: 1,
          borderRadius: "4px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
