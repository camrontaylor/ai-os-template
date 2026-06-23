"use client";

import type { ReactNode } from "react";

export function ComposerAssetTray({
  children,
  error,
  compact,
}: {
  children?: ReactNode;
  error?: string | null;
  compact?: boolean;
}) {
  if (!children && !error) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: compact ? "8px 8px 4px" : "12px 12px 4px",
      }}
    >
      {children}
      {error ? (
        <div className="text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
