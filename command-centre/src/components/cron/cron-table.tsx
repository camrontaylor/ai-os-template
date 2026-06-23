"use client";

import { useEffect, useState } from "react";
import { Plus, Clock } from "lucide-react";
import { useCronStore } from "@/store/cron-store";
import { useClientStore } from "@/store/client-store";
import { CronRow } from "./cron-row";
import { CreateJobPanel } from "./create-job-panel";
import { RuntimeStatus } from "./runtime-status";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CronJobsView() {
  const jobs = useCronStore((s) => s.jobs);
  const isLoading = useCronStore((s) => s.isLoading);
  const fetchJobs = useCronStore((s) => s.fetchJobs);
  const setShowCreatePanel = useCronStore((s) => s.setShowCreatePanel);
  const setEditingJob = useCronStore((s) => s.setEditingJob);
  const moveJob = useCronStore((s) => s.moveJob);
  const selectedClientId = useClientStore((s) => s.selectedClientId);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveJob(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    setEditingJob(null);
    fetchJobs();
  }, [fetchJobs, selectedClientId, setEditingJob]);

  const activeCount = jobs.filter((j) => j.active).length;
  const pausedCount = jobs.filter((j) => !j.active).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const runsToday = jobs.filter(
    (j) => j.lastRun?.lastRun && j.lastRun.lastRun.startsWith(todayStr)
  ).length;

  const stats: { value: string; label: string }[] = [
    { value: String(activeCount), label: "Active Jobs" },
    { value: String(pausedCount), label: "Paused Jobs" },
    { value: String(runsToday), label: "Runs Today" },
    { value: "$0.00", label: "Today's Spend" },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="min-w-0 gap-0 rounded-lg border p-4 shadow-none"
          >
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
          </Card>
        ))}
      </div>

      <RuntimeStatus />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">Scheduled Tasks</h3>
        <Button onClick={() => setShowCreatePanel(true)} size="sm">
          <Plus className="size-4" />
          Create Job
        </Button>
      </div>

      {/* Table container for horizontal scroll */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 1050 }}>
          {/* Table header */}
          <div
            className="mb-3 grid gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground"
            style={{
              gridTemplateColumns: "1.5fr 1fr 0.8fr 0.8fr 0.7fr 90px 280px",
            }}
          >
            <span className="pl-[24px]">Name</span>
            <span>Schedule</span>
            <span>Last Run</span>
            <span>Next Run</span>
            <span>Avg Duration</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {isLoading && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading scheduled tasks...
            </div>
          )}

          {!isLoading && jobs.length === 0 && (
            <div className="px-5 py-16 text-center">
              <Clock className="mx-auto mb-4 size-12 text-muted-foreground" />
              <h4 className="mb-2 text-base font-semibold text-foreground">
                No scheduled tasks configured yet
              </h4>
              <p className="mx-auto mb-5 max-w-sm text-sm text-muted-foreground">
                Set up recurring tasks to automate your regular workflows.
              </p>
              <Button onClick={() => setShowCreatePanel(true)} size="sm">
                Create First Job
              </Button>
            </div>
          )}

          {!isLoading &&
            jobs.map((job, i) => (
              <CronRow
                key={`${job.clientId ?? "root"}:${job.slug}`}
                job={job}
                index={i}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragOver={dragOverIndex === i}
                isDragging={dragIndex === i}
              />
            ))}
        </div>
      </div>

      <CreateJobPanel />
    </div>
  );
}
