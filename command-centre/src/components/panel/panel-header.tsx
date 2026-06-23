"use client";

import { X } from "lucide-react";
import type { Task } from "@/types/task";
import { LevelBadge } from "../board/level-badge";
import { useTaskStore } from "@/store/task-store";
import { PermissionPicker } from "@/components/shared/permission-picker";
import { getExecutionPermissionMode, getPickerPermissionMode } from "@/lib/permission-mode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getSkillLabel(activityLabel: string | null): string {
  if (!activityLabel) return "General";
  // Match skill name patterns like mkt-*, str-*, viz-*, tool-*, ops-*, meta-*, acc-*
  const match = activityLabel.match(
    /\b(mkt|str|viz|tool|ops|meta|acc)-[a-z0-9-]+/i
  );
  return match ? match[0] : "General";
}

export function PanelHeader({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const pickerMode = getPickerPermissionMode(
    task.permissionMode,
    task.executionPermissionMode,
    task.status,
  );

  const handlePermissionModeChange = (mode: "bypassPermissions" | "default" | "plan") => {
    if (mode === "plan") {
      void updateTask(task.id, {
        permissionMode: "plan",
        executionPermissionMode: getExecutionPermissionMode(
          task.executionPermissionMode ?? task.permissionMode,
          "bypassPermissions",
        ),
      });
      return;
    }

    if (task.permissionMode === "plan") {
      void updateTask(task.id, { executionPermissionMode: mode });
      return;
    }

    if (task.status === "running") {
      void updateTask(task.id, { executionPermissionMode: mode });
      return;
    }

    void updateTask(task.id, {
      permissionMode: mode,
      executionPermissionMode: mode,
    });
  };

  return (
    <div>
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left side: title + meta */}
        <div className="mr-3 min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-foreground">
            {task.title}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <LevelBadge level={task.level} />
            <span className="text-xs text-muted-foreground">
              {getSkillLabel(task.activityLabel)}
            </span>
            <div className="ml-1 flex items-center gap-2">
              <PermissionPicker value={pickerMode} onChange={handlePermissionModeChange} />
              {task.permissionMode === "plan" && (
                <Badge
                  variant="secondary"
                  className="px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Plan active
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right side: close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-8 shrink-0 text-muted-foreground"
        >
          <X size={20} />
        </Button>
      </div>

      {/* Bottom separator */}
      <div className="h-px bg-border" />
    </div>
  );
}
