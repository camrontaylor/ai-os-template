import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { emitTaskEvent } from "@/lib/event-bus";
import type { Task } from "@/types/task";

/**
 * POST /api/tasks/[id]/execute
 * Manually trigger execution of a task by setting it to 'queued'.
 * The queue watcher picks up the status change and spawns Claude CLI.
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

    // Cannot execute an already running task
    if (task.status === "running") {
      return NextResponse.json(
        { error: "Task is already running" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Set to queued -- the queue watcher handles the rest
    db.prepare(
      "UPDATE tasks SET status = ?, updatedAt = ?, errorMessage = NULL WHERE id = ?"
    ).run("queued", now, id);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task;

    emitTaskEvent({
      type: "task:updated",
      task: updated,
      timestamp: now,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/tasks/[id]/execute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
