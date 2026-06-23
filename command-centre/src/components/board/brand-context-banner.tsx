"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useContextStore } from "@/store/context-store";
import { useTaskStore } from "@/store/task-store";
import { useClientStore } from "@/store/client-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BrandContextBanner() {
  const hasBrandContext = useContextStore((s) => s.hasBrandContext);
  const fetchContextStatus = useContextStore((s) => s.fetchContextStatus);
  const createTask = useTaskStore((s) => s.createTask);
  const selectedClientId = useClientStore((s) => s.selectedClientId);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchContextStatus(selectedClientId);
  }, [selectedClientId, fetchContextStatus]);

  if (hasBrandContext !== false) return null;

  const handleRunStartHere = async () => {
    setCreating(true);
    try {
      await createTask(
        "Start Here",
        "Run /start-here",
        "task",
        null,  // projectSlug
        null,  // parentId
        "bypassPermissions"
      );
      // Find the newly created task and queue it
      const tasks = useTaskStore.getState().tasks;
      const startHereTask = tasks.find(
        (t) => t.title === "Start Here" && t.status === "backlog"
      );
      if (startHereTask) {
        await useTaskStore.getState().updateTask(startHereTask.id, { status: "queued" });
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="mx-4 mb-3 flex-row items-center gap-3 rounded-lg border p-4 shadow-none sm:mx-6">
      <Sparkles size={18} className="shrink-0 text-foreground" />
      <span className="flex-1 text-[13px] text-foreground">
        Brand context is missing. Run the onboarding flow to set up your voice, positioning, and ICP.
      </span>
      <Button
        onClick={handleRunStartHere}
        disabled={creating}
        size="sm"
        className="whitespace-nowrap"
      >
        {creating ? "Creating..." : "Run Start-Here"}
      </Button>
    </Card>
  );
}
