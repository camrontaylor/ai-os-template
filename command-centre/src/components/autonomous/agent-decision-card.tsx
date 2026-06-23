"use client";

import { Lightbulb, GitBranch, Zap } from "lucide-react";
import type { AgentDecision } from "@/types/chat";
import { Card } from "@/components/ui/card";

interface AgentDecisionCardProps {
  decision: AgentDecision;
}

const DECISION_ICONS: Record<string, typeof Lightbulb> = {
  scope: Lightbulb,
  decompose: GitBranch,
  delegate: Zap,
  clarify: Lightbulb,
  complete_inline: Zap,
};

const DECISION_LABELS: Record<string, string> = {
  scope: "Scoped",
  decompose: "Decomposed",
  delegate: "Delegated",
  clarify: "Clarifying",
  complete_inline: "Handled inline",
};

export function AgentDecisionCard({ decision }: AgentDecisionCardProps) {
  const Icon = DECISION_ICONS[decision.decisionType] || Lightbulb;
  const label = DECISION_LABELS[decision.decisionType] || decision.decisionType;

  return (
    <Card className="max-w-[480px] gap-0 rounded-lg border p-3 shadow-none">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
          {label}
          {decision.level ? ` - Level ${decision.level}` : ""}
        </span>
      </div>

      {decision.reasoning && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {decision.reasoning}
        </p>
      )}
    </Card>
  );
}
