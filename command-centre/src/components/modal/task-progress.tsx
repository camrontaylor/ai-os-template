"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return "0s";
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return "0s";
  const ms = Math.max(0, Date.now() - start);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return `${min}m ${rem.toString().padStart(2, "0")}s`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
}

interface TaskProgressProps {
  logEntries?: unknown[];
  status: string;
  startedAt?: string | null;
  noBorder?: boolean;
}

export function TaskProgress({ status, startedAt, noBorder }: TaskProgressProps) {
  const [, setTick] = useState(0);
  const isRunning = status === "running";
  const isComplete = status === "done" || status === "review";

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  if (status === "backlog" || status === "queued") return null;

  const elapsed = formatElapsed(startedAt ?? null);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 px-6 py-3",
        !noBorder && "border-b border-border",
      )}
    >
      {isRunning && (
        <span className="inline-block size-2 shrink-0 rounded-full bg-primary [animation:pulse-dot_2s_ease-in-out_infinite]" />
      )}
      <span
        className={cn(
          "text-[13px] font-semibold",
          isRunning ? "text-primary" : "text-muted-foreground",
        )}
      >
        {isRunning ? `Running - ${elapsed}` : isComplete ? `Completed in ${elapsed}` : elapsed}
      </span>
    </div>
  );
}
