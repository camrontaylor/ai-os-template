"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";

interface PhaseProgressStripProps {
  task: Task;
  childTasks: Task[];
  onScrollToPhase?: (phaseNumber: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "var(--muted-foreground)",
  queued: "var(--muted-foreground)",
  running: "var(--border)",
  review: "var(--primary)",
  done: "var(--muted-foreground)",
};

const GSD_STEP_LABELS: Record<string, string> = {
  discuss: "Discuss",
  plan: "Plan",
  execute: "Execute",
  verify: "Verify",
};

/**
 * Sticky progress strip at the top of the chat scroll area.
 * GSD projects: horizontal phase pills with progress bar.
 * Planned projects: progress bar with subtask status dots.
 */
export function PhaseProgressStrip({
  task,
  childTasks,
  onScrollToPhase,
}: PhaseProgressStripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const isGsd = task.level === "gsd";
  const doneCount = childTasks.filter((c) => c.status === "done").length;
  const total = childTasks.length;
  const progressPct = total > 0 ? (doneCount / total) * 100 : 0;

  // Find the active phase (first non-done) for GSD
  const activePhase = isGsd
    ? childTasks.find((c) => c.status !== "done")
    : null;

  const updateFades = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateFades();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateFades, { passive: true });
    return () => el.removeEventListener("scroll", updateFades);
  }, [updateFades, childTasks.length]);

  if (total === 0) return null;

  if (isGsd) {
    // GSD: phase pills + progress bar
    return (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          backgroundColor: "color-mix(in srgb, var(--card) 95%, transparent)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border)",
          padding: "8px 24px 12px",
        }}
      >
        {/* Phase pills row */}
        <div style={{ position: "relative" }}>
          {showLeftFade && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 24,
                background: "linear-gradient(to right, color-mix(in srgb, var(--card) 95%, transparent), transparent)",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
          )}
          {showRightFade && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 24,
                background: "linear-gradient(to left, color-mix(in srgb, var(--card) 95%, transparent), transparent)",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
          )}
          <div
            ref={scrollContainerRef}
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              paddingBottom: 4,
            }}
          >
            {childTasks.map((child) => {
              const isActive = activePhase?.id === child.id;
              const statusColor = STATUS_COLORS[child.status] ?? "var(--muted-foreground)";
              const stepLabel = child.gsdStep
                ? GSD_STEP_LABELS[child.gsdStep] ?? child.gsdStep
                : "";

              return (
                <button
                  key={child.id}
                  onClick={() => {
                    if (child.phaseNumber != null) {
                      onScrollToPhase?.(child.phaseNumber);
                    }
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-1 transition-colors",
                    isActive
                      ? "border-primary bg-muted/40"
                      : "border-border bg-transparent hover:border-foreground/20 hover:bg-muted/40",
                  )}
                >
                  {/* Status dot */}
                  <span
                    className={cn(
                      "size-[8px] shrink-0 rounded-full",
                      child.status === "running" && "[animation:pulse-dot_2s_ease-in-out_infinite]",
                    )}
                    style={{ backgroundColor: statusColor }}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap text-[11px]",
                      isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                    )}
                  >
                    {child.phaseNumber != null ? `P${child.phaseNumber}` : ""}
                    {stepLabel ? ` · ${stepLabel}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: "var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                borderRadius: 2,
                backgroundColor: "var(--primary)",
                transition: "width 300ms ease",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-inter), Inter, sans-serif",
              color: "var(--muted-foreground)",
              whiteSpace: "nowrap",
            }}
          >
            {doneCount}/{total} phases
          </span>
        </div>
      </div>
    );
  }

  // Planned project: progress bar + status dots
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        backgroundColor: "color-mix(in srgb, var(--card) 95%, transparent)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
        padding: "8px 24px 12px",
      }}
    >
      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              borderRadius: 2,
              backgroundColor: "var(--primary)",
              transition: "width 300ms ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            color: "var(--muted-foreground)",
            whiteSpace: "nowrap",
          }}
        >
          {doneCount}/{total} subtasks
        </span>
      </div>

      {/* Status dots row */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        {childTasks.map((child) => (
          <span
            key={child.id}
            title={child.title}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: STATUS_COLORS[child.status] ?? "var(--muted-foreground)",
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Floating badge that appears when PhaseProgressStrip scrolls out of view.
 * Shows "Phase N of M · StepName".
 */
export function PhaseFloatingBadge({
  task,
  childTasks,
  visible,
  onJump,
}: {
  task: Task;
  childTasks: Task[];
  visible: boolean;
  onJump: () => void;
}) {
  if (!visible || childTasks.length === 0) return null;

  const isGsd = task.level === "gsd";
  const doneCount = childTasks.filter((c) => c.status === "done").length;
  const total = childTasks.length;

  // Find active phase
  const activePhase = isGsd
    ? childTasks.find((c) => c.status !== "done")
    : null;

  const label = isGsd && activePhase
    ? `Phase ${activePhase.phaseNumber ?? "?"} of ${total} · ${GSD_STEP_LABELS[activePhase.gsdStep ?? ""] ?? ""}`
    : `${doneCount}/${total} subtasks`;

  return (
    <button
      onClick={onJump}
      style={{
        position: "absolute",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--border)",
        borderRadius: "1rem",
        padding: "4px 16px",
        fontSize: 11,
        fontFamily: "var(--font-inter), Inter, sans-serif",
        fontWeight: 500,
        color: "var(--primary)",
        cursor: "pointer",
        transition: "opacity 200ms ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {label}
    </button>
  );
}
