"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Layers, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LibrarySkill {
  name: string;
  category: string;
  description: string;
  dupe: boolean;
  triggers: string[];
  source: string;
  stage: "backlog" | "triage" | "review" | "live";
}

interface LibraryResponse {
  candidates: LibrarySkill[];
  stageCounts: Record<string, number>;
  builtNote: string;
}

const STAGE_ORDER: LibrarySkill["stage"][] = ["backlog", "triage", "review", "live"];
const STAGE_LABEL: Record<string, string> = {
  backlog: "Backlog",
  triage: "Triage",
  review: "Review",
  live: "Live",
};

function LibraryCard({ skill }: { skill: LibrarySkill }) {
  const desc =
    skill.description.length > 140
      ? skill.description.slice(0, 140).trimEnd() + "…"
      : skill.description;

  return (
    <Card className="gap-3 rounded-lg p-4 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40">
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="px-2 py-0 text-[10px] font-medium uppercase tracking-wide"
        >
          {skill.category}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {skill.name}
        </span>
        <Badge
          variant="outline"
          className="shrink-0 px-2 py-0 text-[10px] font-medium text-muted-foreground"
        >
          {STAGE_LABEL[skill.stage] || skill.stage}
        </Badge>
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground">{desc}</p>

      {skill.triggers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skill.triggers.slice(0, 4).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="px-2 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {skill.source && (
          <span className="min-w-0 truncate">{skill.source}</span>
        )}
        {skill.dupe && (
          <span className="ml-auto shrink-0 font-medium text-foreground">
            overlaps a live skill
          </span>
        )}
      </div>
    </Card>
  );
}

export function SkillsLibrary() {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/skills/library")
      .then((r) => r.json())
      .then((d: LibraryResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const candidates = data?.candidates ?? [];

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of candidates) counts[c.category] = (counts[c.category] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.triggers.some((t) => t.toLowerCase().includes(q)) ||
        c.source.toLowerCase().includes(q)
      );
    });
  }, [candidates, query, category]);

  const grouped = useMemo(() => {
    const map: Record<string, LibrarySkill[]> = {};
    for (const c of filtered) {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

  if (candidates.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <Layers className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h4 className="mb-2 text-base font-semibold text-foreground">
          Library is empty
        </h4>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          No candidate skills are staged yet.
        </p>
      </div>
    );
  }

  const stageCounts = data?.stageCounts ?? {};

  return (
    <div className="p-6">
      {/* Intro: what the library is + the pipeline */}
      <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">
            Candidate skills (staging, not active)
          </h4>
        </div>
        <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
          Collected from skill packs, these are inert until promoted. The pipeline
          is backlog to triage to review to live. The assistant only consults this
          library as a fallback when no installed skill fits a task.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {STAGE_ORDER.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="px-2 py-0 text-[11px] font-medium text-muted-foreground"
            >
              {STAGE_LABEL[s]} {stageCounts[s] ?? 0}
            </Badge>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search candidates..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={category === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCategory("all")}
          className="h-7 px-3 text-xs"
        >
          All {candidates.length}
        </Button>
        {categories.map(([cat, count]) => (
          <Button
            key={cat}
            variant={category === cat ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCategory(cat)}
            className="h-7 px-3 text-xs"
          >
            {cat} {count}
          </Button>
        ))}
      </div>

      {/* Grouped candidates */}
      {grouped.map(([cat, skills]) => (
        <div key={cat} className="mb-7">
          <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
              {cat}
            </h4>
            <span className="text-[10px] font-medium text-muted-foreground">
              ({skills.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {skills.map((skill) => (
              <LibraryCard key={`${skill.stage}-${skill.name}`} skill={skill} />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className={cn("p-10 text-center text-sm text-muted-foreground")}>
          No candidates match your filters.
        </p>
      )}
    </div>
  );
}
