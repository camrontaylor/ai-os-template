"use client";

import { useEffect, useRef, useState } from "react";

type ContextStatus =
  | {
      status: "available";
      source: "exact" | "estimated";
      percentUsed: number;
      percentRemaining: number;
      updatedAt: string | null;
    }
  | {
      status: "unavailable";
      reason: "no_session" | "no_data";
    };

function formatUpdatedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContextUsageRing({ taskId }: { taskId: string | null }) {
  const [status, setStatus] = useState<ContextStatus | null>(null);
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/context-status`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          setStatus({ status: "unavailable", reason: "no_data" });
          return;
        }
        setStatus(await res.json() as ContextStatus);
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus({ status: "unavailable", reason: "no_data" });
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [taskId]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!taskId) return null;

  const available = status?.status === "available" ? status : null;
  const percent = available ? available.percentUsed : 0;
  const degrees = Math.max(0, Math.min(100, percent)) * 3.6;

  function showTooltip() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
  }

  function hideTooltip() {
    hideTimer.current = setTimeout(() => setHovered(false), 120);
  }

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <span
        aria-label={
          available
            ? `Context: ${available.percentUsed}% used, ${available.percentRemaining}% remaining`
            : "Context unavailable"
        }
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: `conic-gradient(var(--primary) ${degrees}deg, var(--border) 0deg)`,
          display: "inline-block",
          flexShrink: 0,
          cursor: "default",
          // Transparent donut center via CSS mask
          maskImage: "radial-gradient(transparent 4px, black 5px)",
          WebkitMaskImage: "radial-gradient(transparent 4px, black 5px)",
        } as React.CSSProperties}
      />

      {hovered && (
        <div
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          style={{
            position: "absolute",
            bottom: "calc(100% + 12px)",
            left: 0,
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 8px 24px color-mix(in srgb, var(--foreground) 8%, transparent), 0 2px 8px color-mix(in srgb, var(--foreground) 4%, transparent)",
            padding: "12px 16px",
            minWidth: 180,
            zIndex: 1000,
          }}
        >
          {/* Header label */}
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: "var(--muted-foreground)",
              marginBottom: 12,
            }}
          >
            Context Window
          </div>

          {available ? (
            <>
              {/* Progress bar */}
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "var(--border)",
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${available.percentUsed}%`,
                    borderRadius: 2,
                    backgroundColor: "var(--primary)",
                  }}
                />
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      fontFamily: "var(--font-inter), Inter, sans-serif",
                      color: "var(--primary)",
                      lineHeight: 1,
                    }}
                  >
                    {available.percentUsed}%
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-inter), Inter, sans-serif",
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      marginTop: 4,
                    }}
                  >
                    Used
                  </div>
                </div>

                <div
                  style={{
                    width: 1,
                    backgroundColor: "var(--border)",
                    alignSelf: "stretch",
                  }}
                />

                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      fontFamily: "var(--font-inter), Inter, sans-serif",
                      color: "var(--foreground)",
                      lineHeight: 1,
                    }}
                  >
                    {available.percentRemaining}%
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-inter), Inter, sans-serif",
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      marginTop: 4,
                    }}
                  >
                    Free
                  </div>
                </div>
              </div>

              {/* Footer: source + time */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-inter), Inter, sans-serif",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {available.source === "exact" ? "Exact" : "Estimated"}
                </span>
                {available.updatedAt && (
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-inter), Inter, sans-serif",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatUpdatedAt(available.updatedAt)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 12,
                fontFamily: "var(--font-inter), Inter, sans-serif",
                color: "var(--muted-foreground)",
              }}
            >
              No data available
            </div>
          )}

          {/* Arrow border */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginLeft: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "8px 8px 0 8px",
              borderColor: "var(--border) transparent transparent transparent",
            }}
          />
          {/* Arrow fill */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginLeft: 1,
              marginTop: -1,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "7px 7px 0 7px",
              borderColor: "var(--card) transparent transparent transparent",
            }}
          />
        </div>
      )}
    </span>
  );
}
