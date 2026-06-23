"use client";

import { Paperclip, Trash2 } from "lucide-react";
import type { GoalDraftPayload } from "@/types/goal-draft";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const timestamp = new Date(dateStr).getTime();
  if (Number.isNaN(timestamp)) return "--";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDraftBodyPreview(draft: GoalDraftPayload): string {
  const trimmedMessage = draft.message.trim();
  if (trimmedMessage) {
    const firstLine = trimmedMessage.split("\n").find((line) => line.trim().length > 0) ?? trimmedMessage;
    return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
  }
  if (draft.attachments.length > 0) {
    return draft.attachments.length === 1
      ? `1 attached file`
      : `${draft.attachments.length} attached files`;
  }
  return "No details yet";
}

export function GoalDraftCard({
  draft,
  isActive,
  onOpen,
  onDiscard,
}: {
  draft: GoalDraftPayload;
  isActive?: boolean;
  onOpen: (draftId: string) => void;
  onDiscard: (draftId: string) => void;
}) {
  const title = draft.title.trim() || "Untitled draft";
  const preview = getDraftBodyPreview(draft);

  return (
    <Card
      data-card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(draft.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(draft.id);
        }
      }}
      className={cn(
        "cursor-pointer rounded-lg border border-l-[3px] border-l-muted-foreground p-3 shadow-none transition-colors hover:bg-muted/40",
        isActive && "border-foreground/30",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="shrink-0 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Draft
            </Badge>
            <span
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
              title={title}
            >
              {title}
            </span>
          </div>
          <div
            className="mt-2 truncate text-xs leading-relaxed text-muted-foreground"
            title={preview}
          >
            {preview}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {draft.attachments.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Paperclip size={11} />
                {draft.attachments.length}
              </span>
            ) : null}
            <span className="text-[10px] text-muted-foreground">
              updated {timeAgo(draft.updatedAt)}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Discard ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            onDiscard(draft.id);
          }}
          className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </Card>
  );
}
