"use client";

import { useState } from "react";
import { FileText, Image, FileType, ExternalLink } from "lucide-react";
import { useClientStore } from "@/store/client-store";
import type { CronRun, CronRunOutput } from "@/types/cron";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RunHistoryProps {
  runs: CronRun[];
  jobSlug: string;
  prompt?: string;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "--";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(sec: number | null): string {
  if (sec === null) return "--";
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = Math.floor(sec / 60);
  const remaining = Math.round(sec % 60);
  return `${min}m ${remaining}s`;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const RUN_COMPLETION_REASON_LABELS: Record<string, string> = {
  completed: "Normal completion",
  failed: "Normal failure",
  needs_input: "Needs input",
  timed_out: "Normal timeout",
  recovered_inferred_state: "Recovered state",
  recovered_missing_task: "Recovered missing job",
  recovered_orphaned_task: "Recovered orphaned run",
  recovered_from_terminal_task_state: "Recovered finished task",
  recovered_from_stuck_needs_input: "Recovered stuck input",
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function getFileIcon(ext: string) {
  if (IMAGE_EXTENSIONS.has(ext)) return Image;
  if (PDF_EXTENSIONS.has(ext)) return FileType;
  return FileText;
}

function truncateFilename(name: string, maxLen = 28): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 3) + "...";
}

function getRunResultBadge(run: CronRun): { label: string; variant: BadgeVariant } {
  if (run.completionReason === "needs_input") {
    return { label: "Needs input", variant: "outline" };
  }

  switch (run.result) {
    case "success":
      return { label: "Success", variant: "secondary" };
    case "failure":
      return { label: "Failed", variant: "destructive" };
    case "timeout":
      return { label: "Timeout", variant: "outline" };
    default:
      return { label: "Running", variant: "outline" };
  }
}

function getRunTruthLabel(run: CronRun): string | null {
  if (!run.resultSource && !run.completionReason) {
    return null;
  }

  const sourceLabel =
    run.resultSource === "inferred"
      ? "Inferred"
      : run.resultSource === "observed"
        ? "Observed"
        : null;
  const reasonLabel = run.completionReason
    ? RUN_COMPLETION_REASON_LABELS[run.completionReason] || run.completionReason
    : null;

  if (sourceLabel && reasonLabel) {
    return `${sourceLabel} · ${reasonLabel}`;
  }

  return sourceLabel || reasonLabel;
}

function OutputLink({ output }: { output: CronRunOutput }) {
  const Icon = getFileIcon(output.extension);

  return (
    <a
      href={`vscode://file${output.filePath}`}
      onClick={(e) => {
        e.preventDefault();
        // Copy path to clipboard and open via the API
        navigator.clipboard.writeText(output.filePath).catch(() => {});
        window.open(`vscode://file${output.filePath}`, "_blank");
      }}
      title={output.filePath}
    >
      <Badge
        variant="secondary"
        className="cursor-pointer gap-1 px-2 py-1 text-[11px] font-normal transition-colors hover:bg-muted"
      >
        <Icon size={10} />
        {truncateFilename(output.fileName)}
        <ExternalLink size={9} className="opacity-60" />
      </Badge>
    </a>
  );
}

export function RunHistory({ runs, jobSlug, prompt }: RunHistoryProps) {
  const [log, setLog] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const selectedClientId = useClientStore((s) => s.selectedClientId);

  const toggleLog = async () => {
    if (log !== null) {
      setLog(null);
      return;
    }
    setLoadingLog(true);
    try {
      const query = selectedClientId ? `?clientId=${encodeURIComponent(selectedClientId)}` : "";
      const res = await fetch(`/api/cron/${jobSlug}/logs${query}`);
      if (res.ok) {
        const data = await res.json();
        setLog(data.log || "(empty log)");
      } else {
        setLog("(failed to load log)");
      }
    } catch {
      setLog("(failed to load log)");
    } finally {
      setLoadingLog(false);
    }
  };

  if (runs.length === 0) {
    return (
      <div className="rounded-b-lg bg-muted p-4 text-center text-[13px] text-muted-foreground">
        No run history yet
      </div>
    );
  }

  return (
    <div className="rounded-b-lg bg-muted p-4">
      {/* Header */}
      <div
        className="grid gap-2 px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground"
        style={{ gridTemplateColumns: "1fr 80px 120px 100px 80px 1fr" }}
      >
        <span>Date</span>
        <span>Trigger</span>
        <span>Result</span>
        <span>Duration</span>
        <span>Cost</span>
        <span>Outputs</span>
      </div>

      {/* Rows */}
      {runs.map((run) => {
        const badge = getRunResultBadge(run);
        return (
          <div
            key={run.id}
            className="grid items-center gap-2 px-2 py-2 text-[13px]"
            style={{ gridTemplateColumns: "1fr 80px 120px 100px 80px 1fr" }}
          >
            <span className="text-foreground">
              {formatRelativeTime(run.startedAt)}
            </span>
            <span>
              <Badge
                variant={run.trigger === "manual" ? "outline" : "secondary"}
                className="px-2 py-1 text-[11px] font-medium"
              >
                {run.trigger === "manual" ? "Manual" : "Scheduled"}
              </Badge>
            </span>
            <span>
              <Badge
                variant={badge.variant}
                className="px-2 py-1 text-[11px] font-medium"
              >
                {badge.label}
              </Badge>
              {getRunTruthLabel(run) && (
                <div className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {getRunTruthLabel(run)}
                </div>
              )}
            </span>
            <span className="text-muted-foreground">
              {formatDuration(run.durationSec)}
            </span>
            <span className="text-muted-foreground">
              {run.costUsd !== null && run.costUsd > 0
                ? `$${run.costUsd.toFixed(2)}`
                : "--"}
            </span>
            <div className="flex flex-wrap gap-1">
              {run.outputs.length > 0 ? (
                <>
                  {run.outputs.slice(0, 2).map((output, i) => (
                    <OutputLink key={i} output={output} />
                  ))}
                  {run.outputs.length > 2 && (
                    <span className="text-[11px] leading-5 text-muted-foreground">
                      +{run.outputs.length - 2} more
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">--</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Action buttons row */}
      <div className="mt-2 flex gap-4 pl-2">
        {prompt && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowPrompt(!showPrompt)}
            className="h-auto gap-2 px-0 py-1 text-xs font-medium"
          >
            <FileText size={13} />
            {showPrompt ? "Hide Prompt" : "View Prompt"}
          </Button>
        )}
        <Button
          variant="link"
          size="sm"
          onClick={toggleLog}
          disabled={loadingLog}
          className="h-auto gap-2 px-0 py-1 text-xs font-medium"
        >
          <FileText size={13} />
          {loadingLog ? "Loading..." : log !== null ? "Hide Log" : "View Log"}
        </Button>
      </div>

      {/* Prompt content */}
      {showPrompt && prompt && (
        <pre className="mt-2 max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card p-3 font-mono text-[11px] leading-relaxed text-foreground">
          {prompt}
        </pre>
      )}

      {/* Log output */}
      {log !== null && (
        <pre className="mt-2 max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">
          {log}
        </pre>
      )}
    </div>
  );
}
