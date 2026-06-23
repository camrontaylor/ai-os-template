"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface PromptTag {
  name: string;
  body: string;
  starter: boolean;
}

const RECENT_TAGS_KEY = "cc.recent-tags";
const MAX_RECENT = 3;

function getRecentTags(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TAGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function recordTagUsage(name: string) {
  try {
    const recent = getRecentTags().filter((n) => n !== name);
    recent.unshift(name);
    localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

interface GoalChipsProps {
  onInsert: (text: string) => void;
}

export function GoalChips({ onInsert }: GoalChipsProps) {
  const [tags, setTags] = useState<PromptTag[]>([]);

  useEffect(() => {
    fetch("/api/prompt-tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => {});
  }, []);

  if (tags.length === 0) return null;

  const starters = tags.filter((t) => t.starter);
  const recentNames = getRecentTags();
  const recentTags = recentNames
    .map((name) => tags.find((t) => t.name === name))
    .filter((t): t is PromptTag => !!t && !t.starter);

  const chips = [...starters, ...recentTags].slice(0, 5);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 pb-1 pt-1">
      {chips.map((chip) => (
        <Button
          key={chip.name}
          variant="outline"
          size="sm"
          onClick={() => {
            onInsert(`@${chip.name} `);
            recordTagUsage(chip.name);
          }}
          className="h-auto gap-1 px-2 py-1 text-[11px] font-normal text-muted-foreground"
        >
          @{chip.name}
        </Button>
      ))}
    </div>
  );
}
