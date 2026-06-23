"use client";

import Link from "next/link";
import { AlertCircle, Eye, MessageSquare, ArrowRight } from "lucide-react";
import type { DashboardSummary } from "@/types/dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AwaitingReviewProps {
  awaitingReview: DashboardSummary["awaitingReview"];
}

export function AwaitingReview({ awaitingReview }: AwaitingReviewProps) {
  const { reviewCount, needsInputCount, errorCount, tasks } = awaitingReview;
  const totalCount = reviewCount + needsInputCount + errorCount;

  return (
    <Card className="min-w-0 flex-1 gap-0 rounded-lg border p-6 shadow-none">
      <div className="mb-3 flex items-center gap-2">
        <Eye size={16} color="var(--muted-foreground)" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Awaiting Review
        </span>
        {totalCount > 0 && (
          <Badge variant="secondary" className="px-2 py-0 text-[10px] font-semibold">
            {totalCount}
          </Badge>
        )}
      </div>
      {totalCount > 0 ? (
        <>
          {/* Summary line */}
          <div className="flex flex-wrap gap-4">
            {reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <Eye size={12} /> {reviewCount} in review
              </span>
            )}
            {needsInputCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <MessageSquare size={12} /> {needsInputCount} need{needsInputCount === 1 ? "s" : ""} input
              </span>
            )}
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
                <AlertCircle size={12} /> {errorCount} failed
              </span>
            )}
          </div>

          {/* Task previews */}
          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {tasks.slice(0, 4).map((task) => (
              <li key={task.id} className="flex items-start gap-3">
                <span className="mt-[8px] size-2 shrink-0 rounded-full bg-foreground/40" />
                <span className="truncate text-sm leading-normal text-foreground">
                  {task.title}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/board?view=tasks"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary no-underline"
          >
            View all tasks <ArrowRight size={13} />
          </Link>
        </>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">Nothing needs attention. All clear.</p>
      )}
    </Card>
  );
}
