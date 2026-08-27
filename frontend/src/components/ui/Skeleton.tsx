import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = "16px", borderRadius, className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius, ...style }}
      aria-hidden="true"
    />
  );
}

interface SkeletonCardProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonCard({ children, className = "", style }: SkeletonCardProps) {
  return (
    <div className={`skeleton-card design-card ${className}`.trim()} style={{ padding: "var(--space-6)", ...style }} aria-hidden="true">
      {children}
    </div>
  );
}

