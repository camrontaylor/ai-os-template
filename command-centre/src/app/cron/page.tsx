"use client";

import { AppShell } from "@/components/layout/app-shell";
import { CronJobsView } from "@/components/cron/cron-table";

export default function CronPage() {
  return (
    <AppShell title="Scheduled Tasks">
      <CronJobsView />
    </AppShell>
  );
}
