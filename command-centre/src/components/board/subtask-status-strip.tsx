"use client";

interface SubtaskDot {
  id: string;
  title: string;
  status: string;
}

interface SubtaskStatusStripProps {
  subtasks: SubtaskDot[];
  onJump: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: "var(--foreground)",
  review: "color-mix(in srgb, var(--foreground) 35%, transparent)",
  done: "var(--muted-foreground)",
  error: "var(--destructive)",
  queued: "color-mix(in srgb, var(--foreground) 35%, transparent)",
  backlog: "color-mix(in srgb, var(--foreground) 35%, transparent)",
};

export function SubtaskStatusStrip({ subtasks, onJump }: SubtaskStatusStripProps) {
  if (subtasks.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-1 px-4 py-1">
      {subtasks.map((s) => {
        const color = STATUS_COLORS[s.status] || "color-mix(in srgb, var(--foreground) 35%, transparent)";
        const isRunning = s.status === "running";
        return (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            title={`${s.title} (${s.status})`}
            className="size-3 shrink-0 cursor-pointer rounded-full border-none p-0 transition-transform hover:scale-125"
            style={{
              backgroundColor: color,
              animation: isRunning ? "pulse-dot 2s ease-in-out infinite" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
