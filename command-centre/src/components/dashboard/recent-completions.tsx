"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { DashboardSummary } from "@/types/dashboard";
import { Card } from "@/components/ui/card";

interface RecentCompletionsProps {
  recentTasks: DashboardSummary["recentTasks"];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function RecentCompletions({ recentTasks }: RecentCompletionsProps) {
  return (
    <Card className="min-w-0 flex-1 gap-0 rounded-lg border p-6 shadow-none">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 size={16} color="var(--muted-foreground)" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Completions
        </span>
      </div>
      {recentTasks.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {task.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {task.completedAt && timeAgo(task.completedAt)}
                    {task.durationMs != null && (
                      <span> · {formatDuration(task.durationMs)}</span>
                    )}
                    {task.costUsd != null && (
                      <span> · ${task.costUsd.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/history"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary no-underline"
          >
            View all history <ArrowRight size={13} />
          </Link>
        </>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">No completed tasks yet.</p>
      )}
    </Card>
  );
}
