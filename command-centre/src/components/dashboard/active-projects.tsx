"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Layers } from "lucide-react";
import type { DashboardSummary } from "@/types/dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GsdInfo {
  exists: boolean;
  projectName?: string;
  currentPhase?: number | null;
  totalPhases?: number | null;
}

interface ActiveProjectsProps {
  activeProjects: DashboardSummary["activeProjects"];
}

const LEVEL_LABEL: Record<number, string> = {
  1: "Task",
  2: "Planned project",
  3: "GSD project",
};

export function ActiveProjects({ activeProjects }: ActiveProjectsProps) {
  const [gsdInfo, setGsdInfo] = useState<GsdInfo | null>(null);

  const hasDeepBuild = activeProjects.some((p) => p.level === 3);
  useEffect(() => {
    if (hasDeepBuild) {
      fetch("/api/gsd/status")
        .then((res) => res.json())
        .then(setGsdInfo)
        .catch(() => setGsdInfo(null));
    }
  }, [hasDeepBuild]);

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2">
        <FolderOpen size={16} color="var(--muted-foreground)" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Active Projects
        </span>
      </div>
      {activeProjects.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {activeProjects.map((project) => {
            const label = LEVEL_LABEL[project.level] || LEVEL_LABEL[2];
            const isDeepBuild = project.level === 3;
            const progress = project.totalItems > 0
              ? Math.round((project.completedItems / project.totalItems) * 100)
              : isDeepBuild && gsdInfo?.exists && gsdInfo.totalPhases
                ? Math.round(((gsdInfo.currentPhase || 1) / gsdInfo.totalPhases) * 100)
                : 0;

            return (
              <Link
                key={project.slug}
                href={isDeepBuild ? "/gsd" : `/board?project=${encodeURIComponent(project.slug)}`}
                className="text-inherit no-underline"
              >
                <Card className="cursor-pointer gap-0 rounded-lg border p-4 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-0 text-[10px] font-medium uppercase tracking-wide">
                      {label}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{project.name}</div>
                  {project.goal && (
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                      {project.goal}
                    </p>
                  )}
                  <div className="mt-3 flex flex-col gap-2">
                    {isDeepBuild && gsdInfo?.exists && gsdInfo.totalPhases ? (
                      <>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-muted-foreground transition-[width] duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers size={11} color="var(--muted-foreground)" />
                          <span className="text-[11px] text-muted-foreground">
                            Phase {gsdInfo.currentPhase || 1} of {gsdInfo.totalPhases}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {project.totalItems > 0 && (
                          <>
                            <div className="h-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-[width] duration-300"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: project.hasPlanning ? "var(--muted-foreground)" : "var(--primary)",
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {project.completedItems}/{project.totalItems} {project.hasPlanning ? "phases" : "deliverables"}
                            </span>
                          </>
                        )}
                        {project.boardTaskCount > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {project.boardTaskCount} task{project.boardTaskCount !== 1 ? "s" : ""} on board
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">No active projects right now.</p>
      )}
    </div>
  );
}
