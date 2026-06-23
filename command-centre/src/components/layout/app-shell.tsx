"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on narrow viewports
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1280px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setSidebarCollapsed(e.matches);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main style={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
        {/* Sticky header */}
        <header
          className="px-4 sm:px-6"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 56,
            position: "sticky",
            top: 0,
            zIndex: 50,
            backgroundColor: "color-mix(in srgb, var(--background) 80%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            {title || "Command Centre"}
          </h2>
        </header>
        <div
          className="px-4 pb-4 sm:px-6 sm:pb-6"
          style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
