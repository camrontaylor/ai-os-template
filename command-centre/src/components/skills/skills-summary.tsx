"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Cpu, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { InstalledSkill } from "@/types/file";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkillsSummaryProps {
  onSelectSkill: (folderPath: string) => void;
  onAddSkill: () => void;
}

function SkillSummaryCard({
  skill,
  onSelect,
}: {
  skill: InstalledSkill;
  onSelect: () => void;
}) {
  const [depsExpanded, setDepsExpanded] = useState(false);
  const hasDeps = skill.dependencies.length > 0;
  const desc =
    skill.description.length > 100
      ? skill.description.slice(0, 100).trimEnd() + "…"
      : skill.description;

  return (
    <Card
      onClick={onSelect}
      className="cursor-pointer gap-3 rounded-lg p-4 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40"
    >
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

      <p className="text-[13px] leading-relaxed text-muted-foreground">{desc}</p>

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

      {hasDeps && (
        <div className="mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDepsExpanded(!depsExpanded);
            }}
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

export function SkillsSummary({ onSelectSkill, onAddSkill }: SkillsSummaryProps) {
  const [skills, setSkills] = useState<InstalledSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data: InstalledSkill[]) => {
        setSkills(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.triggers.some((t) => t.toLowerCase().includes(q)),
    );
  }, [skills, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, InstalledSkill[]> = {};
    for (const skill of filtered) {
      if (!map[skill.category]) map[skill.category] = [];
      map[skill.category].push(skill);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="gap-2 rounded-lg p-4 shadow-none">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <Cpu className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h4 className="mb-2 text-base font-semibold text-foreground">
          No skills installed
        </h4>
        <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">
          Add skills to extend your assistant&apos;s capabilities.
        </p>
        <Button onClick={onAddSkill} size="sm">
          <Plus className="size-4" /> Add Skill
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header: count, search, add */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            {skills.length} skills installed
          </p>
          <Button onClick={onAddSkill} size="sm">
            <Plus className="size-4" /> Add Skill
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Grouped skills */}
      {grouped.map(([category, categorySkills]) => (
        <div key={category} className="mb-7">
          <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
              {category}
            </h4>
            <span className="text-[10px] font-medium text-muted-foreground">
              ({categorySkills.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categorySkills.map((skill) => (
              <SkillSummaryCard
                key={skill.folderName}
                skill={skill}
                onSelect={() =>
                  onSelectSkill(`.claude/skills/${skill.folderName}/SKILL.md`)
                }
              />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && searchQuery && (
        <p className="p-10 text-center text-sm text-muted-foreground">
          No skills match &quot;{searchQuery}&quot;
        </p>
      )}
    </div>
  );
}
