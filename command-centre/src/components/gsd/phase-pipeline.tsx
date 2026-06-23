"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { GsdPhase } from "@/types/gsd";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PhasePipelineProps {
  phases: GsdPhase[];
  selectedPhase: number | null;
  onSelectPhase: (num: number) => void;
}

export function PhasePipeline({ phases, selectedPhase, onSelectPhase }: PhasePipelineProps) {
  return (
    <div className="flex gap-1 overflow-x-auto py-1">
      {phases.map((phase, i) => {
        const isSelected = selectedPhase === phase.number;
        const labelColor =
          phase.status === "in-progress" ? "text-primary" : "text-muted-foreground";
        const pct = phase.plansTotal > 0 ? (phase.plansComplete / phase.plansTotal) * 100 : 0;

        return (
          <div key={phase.number} className="flex items-center">
            <Card
              onClick={() => onSelectPhase(phase.number)}
              className={cn(
                "min-w-[160px] cursor-pointer gap-2 rounded-lg border p-3 text-left shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40",
                isSelected && "border-foreground/30 bg-muted/40",
              )}
            >
              {/* Phase number + status icon */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    labelColor,
                  )}
                >
                  Phase {phase.number}
                </span>
                {phase.status === "complete" && (
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                )}
                {phase.status === "in-progress" && (
                  <Loader2 className="size-4 animate-spin text-primary" />
                )}
                {phase.status === "not-started" && (
                  <Circle className="size-4 text-muted-foreground/40" />
                )}
              </div>

              {/* Name */}
              <span className="truncate text-[13px] font-medium text-foreground">
                {phase.name}
              </span>

              {/* Plan progress */}
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300",
                      phase.status === "complete" ? "bg-muted-foreground" : "bg-primary",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                  {phase.plansComplete}/{phase.plansTotal}
                </span>
              </div>
            </Card>

            {/* Connector arrow */}
            {i < phases.length - 1 && (
              <div className="flex w-4 shrink-0 items-center justify-center text-xs text-muted-foreground/40">
                &#8594;
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
