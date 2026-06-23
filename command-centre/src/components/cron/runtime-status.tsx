"use client";

import { Activity, ShieldCheck, ShieldAlert } from "lucide-react";
import { useCronStore } from "@/store/cron-store";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatHeartbeat(iso: string | null): string {
  if (!iso) return "n/a";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "n/a";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export function RuntimeStatus() {
  const systemStatus = useCronStore((s) => s.systemStatus);

  if (!systemStatus) {
    return null;
  }

  const isHealthyLeader = systemStatus.leaderState === "active";
  const Icon = isHealthyLeader ? ShieldCheck : ShieldAlert;

  return (
    <Card className="mb-4 grid grid-cols-1 gap-3 rounded-lg border p-4 shadow-none sm:grid-cols-2 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr]">
      <div className="min-w-0 lg:col-span-1 sm:col-span-2">
        <div
          className={cn(
            "mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider",
            isHealthyLeader ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <Icon size={14} />
          Runtime Ownership
        </div>
        <div className="mb-1 text-sm font-semibold text-foreground">
          {systemStatus.statusSummary}
        </div>
        <div className="text-xs text-muted-foreground">
          Reason: <span className="text-foreground">{systemStatus.ownershipReason}</span>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Runtime
        </div>
        <div className="mt-2 text-[13px] text-foreground">{systemStatus.runtime}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Local runtime: {systemStatus.localRuntimePresent ? "present" : "not present"}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Leader
        </div>
        <div className="mt-2 text-[13px] text-foreground">
          {systemStatus.leader ? "local owner" : "standby"}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          State: {systemStatus.leaderState}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Process
        </div>
        <div className="mt-2 text-[13px] text-foreground">
          PID {systemStatus.pid ?? "n/a"}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Activity size={11} />
          Heartbeat {formatHeartbeat(systemStatus.heartbeatAt)}
        </div>
      </div>
    </Card>
  );
}
