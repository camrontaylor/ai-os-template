import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { processManager } from "@/lib/process-manager";
import type { Task } from "@/types/task";

/**
 * POST /api/tasks/[id]/cancel
 * Cancel a running task. Kills the Claude CLI process and moves task to backlog.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
      | Task
      | undefined;

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "running") {
      return NextResponse.json(
        { error: "Task is not running" },
        { status: 400 }
      );
    }

    await processManager.cancelTask(id);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task;
    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/tasks/[id]/cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
