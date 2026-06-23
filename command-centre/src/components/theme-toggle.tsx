"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 0 : 8,
        padding: compact ? 8 : "8px 12px",
        width: compact ? 40 : "auto",
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: 8,
        color: "var(--muted-foreground)",
        cursor: "pointer",
        fontSize: 13,
        transition: "color 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
    >
      {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
      {!compact && (
        <span className="hidden sm:inline">{mounted ? (isDark ? "Light" : "Dark") : "Theme"}</span>
      )}
    </button>
  );
}
