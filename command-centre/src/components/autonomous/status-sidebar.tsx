"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Play, HelpCircle, CheckCircle, Loader } from "lucide-react";
import { useTaskStore } from "@/store/task-store";
import type { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusSidebarProps {
  conversationId: string | null;
}

function TaskRow({ task, onClick }: { task: Task; onClick: (id: string) => void }) {
  const statusIcon = {
    running: <Loader size={12} className="text-foreground [animation:spin_2s_linear_infinite]" />,
    queued: <Play size={12} className="text-muted-foreground" />,
    review: <HelpCircle size={12} className="text-muted-foreground" />,
    done: <CheckCircle size={12} className="text-muted-foreground" />,
    backlog: <Play size={12} className="text-muted-foreground" />,
  };

  return (
    <button
      onClick={() => onClick(task.id)}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/60"
    >
      {statusIcon[task.status]}
      <span className="flex-1 truncate">
        {task.title}
      </span>
    </button>
  );
}

function StatusGroup({ label, tasks, onTaskClick }: {
  label: string;
  tasks: Task[];
  onTaskClick: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center gap-2 px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          ({tasks.length})
        </span>
      </div>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onClick={onTaskClick} />
      ))}
    </div>
  );
}

export function StatusSidebar({ conversationId }: StatusSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const tasks = useTaskStore((s) => s.tasks);
  const openPanel = useTaskStore((s) => s.openPanel);

  // Filter tasks linked to this conversation, or show all active if no conversation
  const relevantTasks = conversationId
    ? tasks.filter((t) => t.conversationId === conversationId || t.status === "running" || t.status === "review")
    : tasks.filter((t) => t.status !== "backlog");

  const running = relevantTasks.filter((t) => t.status === "running" || t.status === "queued");
  const needsInput = relevantTasks.filter((t) => t.status === "review" || t.needsInput);
  const done = relevantTasks.filter((t) => t.status === "done").slice(0, 5);

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-card pt-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="size-7 text-muted-foreground"
          title="Expand sidebar"
        >
          <ChevronRight size={16} />
        </Button>
        {running.length > 0 && (
          <div className="mt-3 size-2 rounded-full bg-foreground [animation:pulse-dot_2s_ease-in-out_infinite]" />
        )}
        {needsInput.length > 0 && (
          <div className="mt-2 size-2 rounded-full bg-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden border-b border-border bg-card md:w-60 md:border-b-0 md:border-r">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 pb-2 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Active Work
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          className="size-6 text-muted-foreground"
          title="Collapse sidebar"
        >
          <ChevronLeft size={14} />
        </Button>
      </div>

      {/* Task groups */}
      <div className="flex-1 overflow-y-auto py-2">
        <StatusGroup label="Running" tasks={running} onTaskClick={openPanel} />
        <StatusGroup label="Needs Your Input" tasks={needsInput} onTaskClick={openPanel} />
        <StatusGroup label="History" tasks={done} onTaskClick={openPanel} />

        {running.length === 0 && needsInput.length === 0 && done.length === 0 && (
          <div className={cn("px-4 py-6 text-center text-xs text-muted-foreground")}>
            No active work yet.
            <br />
            Send a message to get started.
          </div>
        )}
      </div>
    </div>
  );
}
