"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { InstalledSkill } from "@/types/file";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: InstalledSkill;
}

export function SkillCard({ skill }: SkillCardProps) {
  const [depsExpanded, setDepsExpanded] = useState(false);
  const hasDeps = skill.dependencies.length > 0;

  return (
    <Card className="gap-3 rounded-lg p-4 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40">
      {/* Header: category badge + name */}
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="px-2 py-0 text-[10px] font-medium uppercase tracking-wide"
        >
          {skill.category}
        </Badge>
        <span className="truncate text-sm font-semibold text-foreground">
          {skill.name}
        </span>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
        {skill.description}
      </p>

      {/* Trigger chips */}
      {skill.triggers.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {skill.triggers.map((trigger) => (
            <Badge
              key={trigger}
              variant="outline"
              className="px-2 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {trigger}
            </Badge>
          ))}
        </div>
      )}

      {/* Dependencies (collapsible) */}
      {hasDeps && (
        <div className="mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDepsExpanded(!depsExpanded)}
            className="h-auto gap-1 px-0 py-0 text-[11px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {depsExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            Dependencies ({skill.dependencies.length})
          </Button>

          {depsExpanded && (
            <div className="mt-2 flex flex-col gap-2">
              {skill.dependencies.map((dep) => (
                <div key={dep.skill} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={dep.required ? "secondary" : "outline"}
                      className="px-2 py-0 text-[11px] font-medium"
                    >
                      {dep.skill}
                    </Badge>
                    <span
                      className={cn(
                        "text-[10px]",
                        dep.required ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {dep.required ? "Required" : "Optional"}
                    </span>
                  </div>
                  <p className="pl-1 text-xs text-muted-foreground">
                    {dep.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
