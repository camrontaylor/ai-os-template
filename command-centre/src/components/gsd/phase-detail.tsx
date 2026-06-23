"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, Circle, FileText, ChevronDown, ChevronRight, MessageSquare, FileEdit, Rocket, ShieldCheck, Check } from "lucide-react";
import type { GsdPhase, GsdPlan } from "@/types/gsd";
import { useTaskStore } from "@/store/task-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PhaseDetailProps {
  phase: GsdPhase;
  onViewFile: (path: string) => void;
  onPhaseUpdated?: () => void;
  /** When provided, phase action buttons fill a command bar instead of creating tasks directly. */
  onCommand?: (command: string, label: string) => void;
}

function PlanRow({ plan, phaseDir, onViewFile }: { plan: GsdPlan; phaseDir: string; onViewFile: (p: string) => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      {plan.completed ? (
        <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground/40" />
      )}

      <div className="min-w-0 flex-1">
        <span className="mr-2 text-xs font-semibold text-primary">{plan.id}</span>
        <span className="text-[13px] text-foreground">{plan.description}</span>
      </div>

      <div className="flex shrink-0 gap-1">
        {plan.hasPlanFile && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => onViewFile(`${phaseDir}/${plan.id}-PLAN.md`)}
          >
            <FileText className="size-3" /> Plan
          </Button>
        )}
        {plan.hasSummaryFile && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => onViewFile(`${phaseDir}/${plan.id}-SUMMARY.md`)}
          >
            <FileText className="size-3" /> Summary
          </Button>
        )}
      </div>
    </div>
  );
}

const gsdActions: ReadonlyArray<{
  key: string; label: string; icon: typeof MessageSquare; command: string;
  optional?: boolean;
}> = [
  { key: "discuss", label: "Discuss", icon: MessageSquare, command: "discuss-phase", optional: true },
  { key: "plan", label: "Plan", icon: FileEdit, command: "plan-phase" },
  { key: "execute", label: "Execute", icon: Rocket, command: "execute-phase" },
  { key: "verify", label: "Verify", icon: ShieldCheck, command: "verify-work" },
];

export function PhaseDetail({ phase, onViewFile, onPhaseUpdated, onCommand }: PhaseDetailProps) {
  const [criteriaExpanded, setCriteriaExpanded] = useState(false);
  const [launchingAction, setLaunchingAction] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const createTask = useTaskStore((s) => s.createTask);
  const updateTask = useTaskStore((s) => s.updateTask);

  const handleMarkComplete = useCallback(async () => {
    if (markingComplete) return;
    setMarkingComplete(true);
    try {
      const res = await fetch("/api/gsd/phase-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseNumber: phase.number, status: "complete" }),
      });
      if (res.ok) {
        onPhaseUpdated?.();
      }
    } finally {
      setMarkingComplete(false);
    }
  }, [phase.number, markingComplete, onPhaseUpdated]);

  const handleGsdAction = useCallback(async (action: (typeof gsdActions)[number]) => {
    const phaseNum = phase.number;
    const command = `/gsd-${action.command} ${phaseNum}`;
    const label = `${action.label} Phase ${phaseNum}: ${phase.name}`;

    // If parent provides a command handler, fill the command bar instead
    if (onCommand) {
      onCommand(command, label);
      return;
    }

    // Fallback: create + queue a task directly
    if (launchingAction) return;
    setLaunchingAction(action.key);
    try {
      await createTask(label, command, "task");
      const tasks = useTaskStore.getState().tasks;
      const newTask = tasks.find((t) => t.title === label && t.status === "backlog");
      if (newTask) {
        await updateTask(newTask.id, { status: "queued" });
      }
    } finally {
      setLaunchingAction(null);
    }
  }, [phase.number, phase.name, createTask, updateTask, launchingAction, onCommand]);

  const statusLabel = phase.status === "complete" ? "Complete" : phase.status === "in-progress" ? "In Progress" : "Not Started";

  return (
    <Card className="gap-0 rounded-lg border p-6 shadow-none">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span
              className={cnLabel(phase.status)}
            >
              Phase {phase.number}
            </span>
            <Badge variant="secondary" className="px-2 py-0 text-[11px] font-medium">
              {statusLabel}
            </Badge>
            {phase.completedDate && (
              <span className="text-[11px] text-muted-foreground">{phase.completedDate}</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground">{phase.name}</h3>
        </div>

        {/* Phase file links + mark complete */}
        <div className="flex gap-2">
          {phase.phaseDir && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-3 text-[11px]"
              onClick={() => onViewFile(`${phase.phaseDir}/${String(phase.number).padStart(2, "0")}-CONTEXT.md`)}
            >
              <FileText className="size-3" /> Context
            </Button>
          )}
          {phase.status !== "complete" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-3 text-[11px]"
              onClick={handleMarkComplete}
              disabled={markingComplete}
            >
              <Check className="size-3" />
              {markingComplete ? "Saving..." : "Mark Complete"}
            </Button>
          )}
        </div>
      </div>

      {/* GSD Actions */}
      {phase.status !== "complete" && (
        <div className="mb-5 flex flex-wrap gap-2">
          {gsdActions.map((action) => {
            const Icon = action.icon;
            const isLaunching = launchingAction === action.key;
            return (
              <Button
                key={action.key}
                variant="outline"
                size="sm"
                onClick={() => handleGsdAction(action)}
                disabled={isLaunching || launchingAction !== null}
                className="h-8 gap-2 px-4 text-xs"
              >
                <Icon className="size-4" />
                {isLaunching ? "Queued..." : action.label}
                {action.optional && (
                  <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
                )}
              </Button>
            );
          })}
        </div>
      )}

      {/* Goal */}
      <div className="mb-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{phase.goal}</p>
      </div>

      {/* Metadata chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {phase.dependsOn && (
          <Badge variant="secondary" className="px-3 py-1 text-[11px] font-normal text-muted-foreground">
            Depends: {phase.dependsOn}
          </Badge>
        )}
        {phase.requirements.length > 0 && (
          <Badge variant="secondary" className="px-3 py-1 text-[11px] font-normal text-muted-foreground">
            {phase.requirements.length} requirements
          </Badge>
        )}
      </div>

      {/* Success Criteria (collapsible) */}
      {phase.successCriteria.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setCriteriaExpanded(!criteriaExpanded)}
            className="flex items-center gap-2 text-[13px] font-semibold text-foreground"
          >
            {criteriaExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            Success Criteria ({phase.successCriteria.length})
          </button>
          {criteriaExpanded && (
            <div className="mt-2 pl-5">
              {phase.successCriteria.map((sc, i) => (
                <div
                  key={i}
                  className="flex gap-2 py-1 text-[13px] leading-relaxed text-muted-foreground"
                >
                  <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                  <span>{sc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      <div>
        <h4 className="mb-2 text-[13px] font-semibold text-foreground">
          Plans ({phase.plansComplete}/{phase.plansTotal})
        </h4>
        <div>
          {phase.plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} phaseDir={phase.phaseDir} onViewFile={onViewFile} />
          ))}
          {phase.plans.length === 0 && (
            <p className="text-[13px] italic text-muted-foreground">No plans created yet</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function cnLabel(status: GsdPhase["status"]): string {
  const base = "text-xs font-semibold uppercase tracking-wide";
  return status === "in-progress" ? `${base} text-primary` : `${base} text-muted-foreground`;
}
