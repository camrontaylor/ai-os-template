"use client";

import type { ReactNode } from "react";

export function KanbanColumnActive({
  children,
  isEmpty,
}: {
  children: ReactNode;
  isEmpty: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {children}

      {isEmpty && (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center text-[13px] text-muted-foreground">
          No goals yet - enter one above to get started
        </div>
      )}
    </div>
  );
}
