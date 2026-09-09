"use client";

import { useEffect, useState } from "react";
import { AdminSettingItem, getAdminSettings, updateAdminSetting } from "@/features/admin";
import { Spinner, useToast } from "@/components/ui";

export function AdminSettingsTab() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const list = await getAdminSettings();
      const map: Record<string, any> = {};
      list.forEach((s) => {
        map[s.key] = s.value;
      });
      setSettings(map);
    } catch (err) {
      toastError("Failed to fetch settings", err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSetting = async (key: string, value: any, displayName: string) => {
    setSavingKey(key);
    try {
      await updateAdminSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      success("Setting Saved", `${displayName} has been updated.`);
    } catch (err) {
      toastError("Failed to save setting", err instanceof Error ? err.message : "Error saving setting");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "800px" }}>
      <div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
          System & Feature Configuration
        </h2>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
          Dynamic platform settings stored in database. Changes take effect immediately without code modification.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Max Upload Size */}
        <div
          className="design-card"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
              Max Book Upload Size (MB)
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              Maximum file payload limit for PDF and EPUB uploads.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="number"
              min="1"
              max="200"
              value={settings["max_upload_size_mb"] ?? 50}
              onChange={(e) => setSettings((prev) => ({ ...prev, max_upload_size_mb: Number(e.target.value) }))}
              style={{
                width: "90px",
                padding: "0.45rem 0.65rem",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                color: "#ffffff",
                fontSize: "13px",
              }}
            />
            <button
              onClick={() => handleSaveSetting("max_upload_size_mb", Number(settings["max_upload_size_mb"]), "Max Upload Size")}
              disabled={savingKey === "max_upload_size_mb"}
              className="btn btn-primary btn-sm"
            >
              {savingKey === "max_upload_size_mb" ? <Spinner /> : "Save"}
            </button>
          </div>
        </div>

        {/* Allowed File Types */}
        <div
          className="design-card"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
              Allowed File Extensions
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              Comma-separated permitted document extensions (e.g., pdf, epub).
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="text"
              value={
                Array.isArray(settings["allowed_file_types"])
                  ? settings["allowed_file_types"].join(", ")
                  : settings["allowed_file_types"] ?? "pdf, epub"
              }
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  allowed_file_types: e.target.value.split(",").map((s) => s.trim().toLowerCase()),
                }))
              }
              style={{
                width: "160px",
                padding: "0.45rem 0.65rem",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                color: "#ffffff",
                fontSize: "13px",
              }}
            />
            <button
              onClick={() =>
                handleSaveSetting(
                  "allowed_file_types",
                  Array.isArray(settings["allowed_file_types"])
                    ? settings["allowed_file_types"]
                    : String(settings["allowed_file_types"]).split(",").map((s) => s.trim().toLowerCase()),
                  "Allowed File Types"
                )
              }
              disabled={savingKey === "allowed_file_types"}
              className="btn btn-primary btn-sm"
            >
              {savingKey === "allowed_file_types" ? <Spinner /> : "Save"}
            </button>
          </div>
        </div>

        {/* User Registration Toggle */}
        <div
          className="design-card"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
              Public User Registration
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              When disabled, new signups are prevented while existing users continue normally.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(settings["registration_enabled"])}
                onChange={(e) => {
                  const val = e.target.checked;
                  handleSaveSetting("registration_enabled", val, "Registration Toggle");
                }}
                disabled={savingKey === "registration_enabled"}
                style={{ width: "18px", height: "18px", accentColor: "var(--color-accent-primary)" }}
              />
              <span style={{ fontSize: "13px", fontWeight: 600, color: settings["registration_enabled"] ? "#34d399" : "#f87171" }}>
                {settings["registration_enabled"] ? "Enabled" : "Disabled"}
              </span>
            </label>
            {savingKey === "registration_enabled" && <Spinner />}
          </div>
        </div>

        {/* Announcement Banner */}
        <div
          className="design-card"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
              Announcement Banner
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              Broadcast banner text visible at the top of the application for all users. Leave empty to disable.
            </div>
          </div>
          <textarea
            rows={2}
            value={settings["announcement_banner"] ?? ""}
            onChange={(e) => setSettings((prev) => ({ ...prev, announcement_banner: e.target.value }))}
            placeholder="e.g., Scheduled maintenance on Sunday at 2 AM UTC or Welcome to BookNest V2!"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              color: "#ffffff",
              fontSize: "13px",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => handleSaveSetting("announcement_banner", settings["announcement_banner"] || "", "Announcement Banner")}
              disabled={savingKey === "announcement_banner"}
              className="btn btn-primary btn-sm"
            >
              {savingKey === "announcement_banner" ? <Spinner /> : "Save Banner"}
            </button>
          </div>
        </div>

        {/* Default Reading Timer */}
        <div
          className="design-card"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
              Default Reading Timer (Minutes)
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              Default session countdown duration for reader mode focus timer.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="number"
              min="5"
              max="120"
              value={settings["reading_timer_default"] ?? 20}
              onChange={(e) => setSettings((prev) => ({ ...prev, reading_timer_default: Number(e.target.value) }))}
              style={{
                width: "90px",
                padding: "0.45rem 0.65rem",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                color: "#ffffff",
                fontSize: "13px",
              }}
            />
            <button
              onClick={() => handleSaveSetting("reading_timer_default", Number(settings["reading_timer_default"]), "Reading Timer")}
              disabled={savingKey === "reading_timer_default"}
              className="btn btn-primary btn-sm"
            >
              {savingKey === "reading_timer_default" ? <Spinner /> : "Save"}
            </button>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div
          className="design-card"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
              Maintenance Mode Flag
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              Flags system status for incoming client handshakes.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(settings["maintenance_mode"])}
                onChange={(e) => {
                  const val = e.target.checked;
                  handleSaveSetting("maintenance_mode", val, "Maintenance Mode");
                }}
                disabled={savingKey === "maintenance_mode"}
                style={{ width: "18px", height: "18px", accentColor: "#f87171" }}
              />
              <span style={{ fontSize: "13px", fontWeight: 600, color: settings["maintenance_mode"] ? "#f87171" : "var(--color-text-muted)" }}>
                {settings["maintenance_mode"] ? "Active (Locked)" : "Off"}
              </span>
            </label>
            {savingKey === "maintenance_mode" && <Spinner />}
          </div>
        </div>
      </div>
    </div>
  );
}
