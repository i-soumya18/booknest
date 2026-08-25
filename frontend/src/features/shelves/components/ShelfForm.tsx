"use client";

import { useState, useEffect, FormEvent } from "react";
import { Shelf } from "@/types";
import { FormField, Input, TextareaField, Spinner, ErrorBanner } from "@/components/ui";

export interface ShelfFormData {
  name: string;
  description?: string | null;
}

interface ShelfFormProps {
  initialData?: Shelf | null;
  onSubmit: (data: ShelfFormData) => Promise<void>;
  onCancel: () => void;
}

export function ShelfForm({ initialData, onSubmit, onCancel }: ShelfFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const validateField = (val: string) => {
    const newErrors = { ...errors };
    if (!val.trim()) {
      newErrors.name = "Shelf name is required.";
    } else {
      delete newErrors.name;
    }
    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!name.trim()) {
      setErrors({ name: "Shelf name is required." });
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : "Failed to save shelf." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "var(--space-4)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="design-card"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-h2)", marginBottom: "var(--space-6)", color: "var(--color-text-tertiary)", fontWeight: "700", letterSpacing: "-0.02em" }}>
          {initialData ? "✏️ Edit Shelf" : "📁 Create New Shelf"}
        </h2>

        {errors._form && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <ErrorBanner message={errors._form} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <FormField label="Shelf Name" required error={errors.name}>
            <Input
              type="text"
              value={name}
              error={!!errors.name}
              onChange={(e) => {
                setName(e.target.value);
                if (submitted) validateField(e.target.value);
              }}
              onBlur={() => validateField(name)}
              placeholder="e.g. Sci-Fi, System Design, To Buy"
            />
          </FormField>

          <FormField label="Description">
            <TextareaField
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this collection..."
            />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? <Spinner /> : null}
              {loading ? "Saving..." : initialData ? "Update Shelf" : "Create Shelf"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
