"use client";

import { AlertCircle } from "lucide-react";
import type { Task, OutputFile } from "@/types/task";
import { Card } from "@/components/ui/card";
import { PanelStats } from "../panel/panel-stats";
import { PanelOutputs } from "../panel/panel-outputs";

export function ModalSidebar({ task, onFileClick }: { task: Task; onFileClick?: (file: OutputFile) => void }) {
  return (
    <div className="flex w-full flex-col overflow-y-auto border-t border-border bg-muted md:w-80 md:shrink-0 md:border-l md:border-t-0">
      {/* Task name and description */}
      <div className="px-6 pb-4 pt-6">
        <h2 className="m-0 text-lg font-semibold text-foreground">
          {task.title}
        </h2>
        {task.description && (
          <p className="mb-0 mt-2 text-sm leading-relaxed text-muted-foreground">
            {task.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <PanelStats task={task} />

      {/* Spacer */}
      <div className="h-2" />

      {/* Outputs */}
      <PanelOutputs taskId={task.id} clientId={task.clientId} onFileClick={onFileClick} />

      {/* Error section */}
      {task.errorMessage && (
        <Card className="m-6 flex flex-row items-start gap-2 rounded-lg border p-4 shadow-none">
          <AlertCircle className="mt-1 size-4 shrink-0 text-destructive" />
          <span className="text-[13px] leading-snug text-destructive">
            {task.errorMessage}
          </span>
        </Card>
      )}
    </div>
  );
}
