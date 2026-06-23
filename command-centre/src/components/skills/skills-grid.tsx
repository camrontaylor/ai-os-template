"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Cpu } from "lucide-react";
import { SkillCard } from "@/components/skills/skill-card";
import type { InstalledSkill } from "@/types/file";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function SkillsGrid() {
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
        s.triggers.some((t) => t.toLowerCase().includes(q))
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
      <div>
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="gap-2 rounded-lg p-4 shadow-none">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-3 w-2/5" />
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
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          No skills installed. Add skills with{" "}
          <code className="rounded bg-muted px-2 py-1 text-[13px]">
            bash scripts/add-skill.sh
          </code>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Count + search */}
      <div className="mb-5">
        <p className="mb-3 text-[13px] text-muted-foreground">
          {skills.length} skills installed
        </p>

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
        <div key={category} className="mb-6">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categorySkills.map((skill) => (
              <SkillCard key={skill.folderName} skill={skill} />
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
