"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowLeft, X, ArrowUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PhasePipeline } from "@/components/gsd/phase-pipeline";
import { PhaseDetail } from "@/components/gsd/phase-detail";
import { ContentViewer } from "@/components/context/content-viewer";
import { useTaskStore } from "@/store/task-store";
import type { GsdProject } from "@/types/gsd";

export default function GsdPage() {
  const router = useRouter();
  const [project, setProject] = useState<GsdProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pendingCommand, setPendingCommand] = useState("");
  const [pendingLabel, setPendingLabel] = useState("");
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const createTask = useTaskStore((s) => s.createTask);
  const updateTask = useTaskStore((s) => s.updateTask);

  const loadProject = useCallback((keepSelection?: boolean) => {
    fetch("/api/gsd")
      .then((r) => r.json())
      .then((data) => {
        setProject(data as GsdProject);
        if (data.hasPlanning && data.phases?.length > 0 && !keepSelection) {
          const current = data.phases.find((p: { status: string }) => p.status !== "complete");
          setSelectedPhase(current?.number ?? data.phases[data.phases.length - 1].number);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleViewFile = useCallback((path: string) => {
    setViewingFile(path);
  }, []);

  const handlePhaseUpdated = useCallback(() => {
    loadProject(true);
  }, [loadProject]);

  const handleArchive = useCallback(async () => {
    if (!project?.briefSlug) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/gsd/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: project.briefSlug }),
      });
      if (res.ok) {
        setShowArchiveConfirm(false);
        router.push("/");
      }
    } finally {
      setArchiving(false);
    }
  }, [project?.briefSlug, router]);

  const handlePhaseCommand = useCallback((command: string, label: string) => {
    setPendingCommand(command);
    setPendingLabel(label);
    // Focus the input after React renders
    setTimeout(() => commandInputRef.current?.focus(), 0);
  }, []);

  const handleSendCommand = useCallback(async () => {
    const cmd = pendingCommand.trim();
    if (!cmd || isSendingCommand) return;
    setIsSendingCommand(true);
    try {
      const title = pendingLabel || cmd;
      await createTask(title, cmd, "task");
      const tasks = useTaskStore.getState().tasks;
      const newTask = tasks.find((t) => t.title === title && t.status === "backlog");
      if (newTask) {
        await updateTask(newTask.id, { status: "queued" });
      }
      setPendingCommand("");
      setPendingLabel("");
    } finally {
      setIsSendingCommand(false);
    }
  }, [pendingCommand, pendingLabel, isSendingCommand, createTask, updateTask]);

  if (loading) {
    return (
      <AppShell title="GSD">
        <div className="flex flex-col gap-4">
          {[300, 720, 500].map((w, i) => (
            <div
              key={i}
              className="rounded-lg bg-border"
              style={{
                height: i === 1 ? 80 : 20,
                width: Math.min(w, 720),
                maxWidth: "100%",
                animation: "pulse-dot 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="GSD">
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="m-0 text-sm text-destructive">
            Failed to load GSD data: {error}
          </p>
        </div>
      </AppShell>
    );
  }

  if (!project?.hasPlanning) {
    return (
      <AppShell title="GSD">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            No GSD project found. Start one with{" "}
            <code className="rounded bg-muted px-2 py-1 font-mono text-[13px]">
              /gsd-new-project
            </code>
          </p>
        </div>
      </AppShell>
    );
  }

  const selectedPhaseData = project.phases.find((p) => p.number === selectedPhase);

  // File viewer overlay
  if (viewingFile) {
    return (
      <AppShell title="GSD">
        <div>
          {/* Back button */}
          <button
            onClick={() => setViewingFile(null)}
            className="mb-4 flex cursor-pointer items-center gap-2 bg-transparent px-4 py-2 text-[13px] font-medium text-primary"
          >
            &#8592; Back to GSD
          </button>
          <div className="min-h-[400px] rounded-lg border border-border bg-card">
            <ContentViewer selectedPath={viewingFile} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="GSD">
      <div className="flex flex-col gap-6">
        {/* Back to overview */}
        <Link
          href="/"
          className="-mb-4 inline-flex items-center gap-2 text-[13px] font-medium text-primary no-underline"
        >
          <ArrowLeft size={14} />
          Overview
        </Link>

        {/* Project header */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="m-0 mb-1 text-xl font-bold text-foreground">
                {project.name}
              </h2>
              {project.coreValue && (
                <p className="m-0 max-w-[600px] text-[13px] text-muted-foreground">
                  {project.coreValue}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Archive button */}
              {project.briefSlug && (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70"
                >
                  <Archive size={13} />
                  Archive
                </button>
              )}
              <div className="text-right">
                <span className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {project.milestone}
                </span>
                <span className="text-[22px] font-bold text-primary">
                  {project.completedPhases}/{project.totalPhases}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  phases
                </span>
              </div>

              {/* Overall progress ring */}
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="4"
                    strokeDasharray={`${(project.completedPhases / project.totalPhases) * 125.6} 125.6`}
                    strokeLinecap="round"
                    transform="rotate(-90 24 24)"
                    style={{ transition: "stroke-dasharray 500ms ease" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                  {Math.round((project.completedPhases / project.totalPhases) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase pipeline */}
        <PhasePipeline
          phases={project.phases}
          selectedPhase={selectedPhase}
          onSelectPhase={setSelectedPhase}
        />

        {/* Phase detail */}
        {selectedPhaseData && (
          <PhaseDetail phase={selectedPhaseData} onViewFile={handleViewFile} onPhaseUpdated={handlePhaseUpdated} onCommand={handlePhaseCommand} />
        )}

        {/* Command bar - appears when a phase action is clicked */}
        {pendingCommand && (
          <div
            className="sticky bottom-4 flex items-center gap-3 rounded-lg border border-border bg-muted p-3"
            style={{
              boxShadow: "0 -4px 20px color-mix(in srgb, var(--foreground) 6%, transparent)",
            }}
          >
            <input
              ref={commandInputRef}
              value={pendingCommand}
              onChange={(e) => setPendingCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleSendCommand(); }
                if (e.key === "Escape") { setPendingCommand(""); setPendingLabel(""); }
              }}
              className="min-w-0 flex-1 border-none bg-transparent py-1 text-sm font-medium text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => { setPendingCommand(""); setPendingLabel(""); }}
              className="flex cursor-pointer items-center border-none bg-transparent p-1 text-muted-foreground"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={handleSendCommand}
              disabled={isSendingCommand}
              className="flex shrink-0 items-center justify-center rounded-md border-none"
              style={{
                width: 28,
                height: 28,
                background: isSendingCommand ? "var(--border)" : "var(--primary)",
                color: isSendingCommand ? "var(--muted-foreground)" : "var(--card)",
                cursor: isSendingCommand ? "default" : "pointer",
              }}
            >
              <ArrowUp size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Archive confirmation modal */}
      {showArchiveConfirm && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{
            backgroundColor: "color-mix(in srgb, var(--foreground) 40%, transparent)",
          }}
          onClick={() => setShowArchiveConfirm(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-xl border border-border bg-card p-6 sm:p-8"
            style={{
              boxShadow: "0 20px 60px color-mix(in srgb, var(--foreground) 20%, transparent)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">
                Archive GSD Project
              </span>
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <p className="m-0 mb-2 text-sm leading-relaxed text-muted-foreground">
              This will archive the GSD project for <strong>{project.name}</strong>. Here&apos;s what happens:
            </p>

            <div className="my-4 flex flex-col gap-3 rounded-lg bg-muted p-4">
              <div className="flex items-start gap-3">
                <span style={stepNumStyle}>1</span>
                <span style={stepTextStyle}>
                  The brief&apos;s status changes from <strong>active</strong> to <strong>complete</strong>
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span style={stepNumStyle}>2</span>
                <span style={stepTextStyle}>
                  <strong>projects/briefs/{project.briefSlug}/.planning/</strong> stays in place as a self-contained historical record
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span style={stepNumStyle}>3</span>
                <span style={stepTextStyle}>
                  The project disappears from Active Projects. You can start another GSD project anytime, each one owns its own planning folder.
                </span>
              </div>
            </div>

            <p className="m-0 mb-1 text-[13px] leading-relaxed text-muted-foreground">
              Nothing moves or is deleted. Every planning artifact stays exactly where it already lives inside the brief folder.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="cursor-pointer rounded-lg border border-border bg-transparent px-4 py-2 text-[13px] font-medium text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="rounded-lg border-none bg-muted-foreground px-4 py-2 text-[13px] font-semibold text-card"
                style={{
                  cursor: archiving ? "not-allowed" : "pointer",
                  opacity: archiving ? 0.6 : 1,
                }}
              >
                {archiving ? "Archiving..." : "Yes, archive this project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const stepNumStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  borderRadius: "50%",
  backgroundColor: "var(--muted-foreground)",
  color: "var(--card)",
  fontSize: 11,
  fontWeight: 700,
  flexShrink: 0,
};

const stepTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--foreground)",
  lineHeight: 1.5,
};
