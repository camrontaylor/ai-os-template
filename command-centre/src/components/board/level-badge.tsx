"use client";

import type { TaskLevel } from "@/types/task";
import { LEVEL_LABELS } from "@/lib/levels";
import { Badge } from "@/components/ui/badge";

export function LevelBadge({ level, projectSlug }: { level: TaskLevel; projectSlug?: string | null }) {
  const label = projectSlug
    ? projectSlug.replace(/-/g, " ")
    : LEVEL_LABELS[level];
  return (
    <Badge
      variant="secondary"
      className="block max-w-[200px] truncate px-2 py-1 text-[11px] font-medium text-muted-foreground"
    >
      {label}
    </Badge>
  );
}
