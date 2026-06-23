"use client";

import { useEffect, useState } from "react";
import { Brain, ChevronDown, ChevronRight, NotebookPen, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownPreview } from "@/components/shared/markdown-preview";
import { useClientId, appendClientId } from "@/hooks/use-client-id";

interface DailyLog {
  name: string;
  date: string;
  content: string;
}

interface MemoryData {
  memory: string | null;
  memoryChars: number;
  learnings: string | null;
  dailyLogs: DailyLog[];
}

const MEMORY_CAP = 2500;

function Collapsible({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-none">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="shrink-0 text-[11px] text-muted-foreground">{subtitle}</span>}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 text-[13px] leading-relaxed">
          {children}
        </div>
      )}
    </Card>
  );
}

export function MemoryView() {
  const clientId = useClientId();
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(appendClientId("/api/memory", clientId))
      .then((r) => r.json())
      .then((d: MemoryData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const memory = data?.memory;
  const logs = data?.dailyLogs ?? [];
  const learnings = data?.learnings;
  const chars = data?.memoryChars ?? 0;
  const overCap = chars > MEMORY_CAP;

  if (!memory && logs.length === 0 && !learnings) {
    return (
      <div className="px-5 py-16 text-center">
        <Brain className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h4 className="mb-2 text-base font-semibold text-foreground">No memory yet</h4>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          This workspace has no MEMORY.md, daily logs, or learnings recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Working scratchpad */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Brain className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Working memory</h4>
          <Badge
            variant="outline"
            className={`ml-auto px-2 py-0 text-[10px] font-medium ${overCap ? "text-foreground" : "text-muted-foreground"}`}
          >
            {chars} / {MEMORY_CAP} chars
          </Badge>
        </div>
        <Card className="rounded-lg p-4 shadow-none">
          {memory ? (
            <div className="chat-markdown text-[13px] leading-relaxed">
              <MarkdownPreview content={memory} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No MEMORY.md scratchpad for this workspace.</p>
          )}
        </Card>
      </div>

      {/* Daily logs */}
      {logs.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <NotebookPen className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Daily logs</h4>
            <span className="text-[11px] text-muted-foreground">({logs.length})</span>
          </div>
          <div className="flex flex-col gap-3">
            {logs.map((log, i) => (
              <Collapsible key={log.name} title={log.date} subtitle={log.name} defaultOpen={i === 0}>
                <div className="chat-markdown">
                  <MarkdownPreview content={log.content} />
                </div>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Learnings */}
      {learnings && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Learnings</h4>
          </div>
          <Collapsible title="context/learnings.md" subtitle="accumulated per-skill learnings">
            <div className="chat-markdown">
              <MarkdownPreview content={learnings} />
            </div>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
