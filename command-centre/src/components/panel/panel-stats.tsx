"use client";

import type { Task } from "@/types/task";

const statusColorMap: Record<string, string> = {
  backlog: "var(--muted-foreground)",
  queued: "var(--muted-foreground)",
  running: "var(--primary)",
  review: "var(--primary)",
  done: "var(--muted-foreground)",
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PanelStats({ task }: { task: Task }) {
  const statusColor = statusColorMap[task.status] || "var(--muted-foreground)";

  return (
    <div className="px-6">
      <div className="rounded-lg bg-muted p-5">
        {/* 2x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Status */}
          <StatCell
            label="Status"
            value={
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: statusColor,
                    animation:
                      task.status === "running"
                        ? "pulse-dot 2s ease-in-out infinite"
                        : undefined,
                  }}
                />
                <span>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </span>
              </div>
            }
          />

          {/* Duration */}
          <StatCell
            label="Duration"
            value={
              task.durationMs !== null ? formatDuration(task.durationMs) : "--"
            }
          />

          {/* Cost */}
          <StatCell
            label="Cost"
            value={
              task.costUsd !== null ? `$${task.costUsd.toFixed(2)}` : "$0.00"
            }
          />

          {/* Tokens */}
          <StatCell
            label="Tokens"
            value={
              task.tokensUsed !== null
                ? formatTokens(task.tokensUsed)
                : "--"
            }
          />
        </div>

        {/* Timestamps */}
        {(task.startedAt || task.completedAt) && (
          <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            {task.startedAt && (
              <span>Started: {formatTimestamp(task.startedAt)}</span>
            )}
            {task.completedAt && (
              <span>Completed: {formatTimestamp(task.completedAt)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}
