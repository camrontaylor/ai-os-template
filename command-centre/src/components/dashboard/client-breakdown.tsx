"use client";

import { Users, FolderOpen, AlertCircle, Globe } from "lucide-react";
import { useClientStore } from "@/store/client-store";
import type { ClientStats } from "@/types/dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClientBreakdownProps {
  clientStats: ClientStats[];
}

export function ClientBreakdown({ clientStats }: ClientBreakdownProps) {
  const setSelectedClient = useClientStore((s) => s.setSelectedClient);

  if (clientStats.length === 0) return null;

  const clientCount = clientStats.filter((c) => c.slug !== "root").length;

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2">
        <Users size={16} color="var(--muted-foreground)" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          By Client
        </span>
        <span className="ml-auto text-[11px] font-medium text-muted-foreground">
          {clientCount} client{clientCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {clientStats.map((client) => (
          <Card
            key={client.slug}
            onClick={() => setSelectedClient(client.slug === "root" ? null : client.slug)}
            className="cursor-pointer gap-0 rounded-lg border p-4 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40"
          >
            {/* Client name with color dot / icon */}
            <div className="mb-4 flex items-center gap-3">
              {client.slug === "root" ? (
                <Globe size={14} className="shrink-0 text-muted-foreground" />
              ) : (
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: client.color }}
                />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {client.name}
              </span>
              {client.reviewCount > 0 && (
                <Badge variant="secondary" className="shrink-0 gap-1 px-2 py-0 text-[10px] font-semibold">
                  <AlertCircle size={11} />
                  {client.reviewCount}
                </Badge>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold leading-none text-foreground">
                  {client.activeTasks}
                </span>
                <span className={statLabelClass}>active</span>
              </div>
              <div className={dividerClass} />
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold leading-none text-foreground">
                  {client.completedTasks}
                </span>
                <span className={statLabelClass}>done (30d)</span>
              </div>
              {client.activeProjects > 0 && (
                <>
                  <div className={dividerClass} />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <FolderOpen size={12} color="var(--muted-foreground)" />
                      <span className="text-base font-semibold leading-none text-foreground">
                        {client.activeProjects}
                      </span>
                    </div>
                    <span className={statLabelClass}>project{client.activeProjects !== 1 ? "s" : ""}</span>
                  </div>
                </>
              )}
              {client.totalCostUsd > 0 && (
                <>
                  <div className={dividerClass} />
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold leading-none text-foreground">
                      ${client.totalCostUsd.toFixed(2)}
                    </span>
                    <span className={statLabelClass}>cost</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const statLabelClass =
  "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const dividerClass = "h-6 w-px bg-border";
