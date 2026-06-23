"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SkillsWorkspace } from "@/components/skills/skills-workspace";

export default function SkillsPage() {
  return (
    <AppShell title="Skills">
      <SkillsWorkspace minHeight="calc(100vh - 200px)" />
    </AppShell>
  );
}
