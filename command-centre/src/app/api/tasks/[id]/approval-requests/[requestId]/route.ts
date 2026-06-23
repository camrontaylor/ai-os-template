import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { emitTaskEvent } from "@/lib/event-bus";
import { getApprovalRequest, resolveApprovalRequest } from "@/lib/approval-requests";
import {
  PERMISSION_DENIED_ACTIVITY_LABEL,
  PERMISSION_RESUMING_ACTIVITY_LABEL,
} from "@/lib/task-permissions";
import type { ApprovalDecision } from "@/types/approval";
import type { Task } from "@/types/task";

const VALID_DECISIONS: ApprovalDecision[] = ["allow_once", "allow_for_task", "deny"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const { id, requestId } = await params;
    const body = await request.json().catch(() => ({}));
    const decision = body?.decision as ApprovalDecision | undefined;
    if (!decision || !VALID_DECISIONS.includes(decision)) {
      return NextResponse.json({ error: "Invalid approval decision" }, { status: 400 });
    }

    const db = getDb();
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const existing = getApprovalRequest(id, requestId);
    if (!existing) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    const resolved = resolveApprovalRequest(id, requestId, decision);
    const now = new Date().toISOString();

    if (decision === "allow_for_task") {
      db.prepare(
        "UPDATE tasks SET permissionMode = 'bypassPermissions', executionPermissionMode = 'bypassPermissions', updatedAt = ?, activityLabel = ?, needsInput = 0, errorMessage = NULL WHERE id = ?"
      ).run(now, PERMISSION_RESUMING_ACTIVITY_LABEL, id);
    } else if (decision === "allow_once") {
      db.prepare(
        "UPDATE tasks SET updatedAt = ?, activityLabel = ?, needsInput = 0, errorMessage = NULL WHERE id = ?"
      ).run(now, PERMISSION_RESUMING_ACTIVITY_LABEL, id);
    } else {
      db.prepare(
        "UPDATE tasks SET updatedAt = ?, activityLabel = ?, needsInput = 1 WHERE id = ?"
      ).run(now, PERMISSION_DENIED_ACTIVITY_LABEL, id);
    }

    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task;
    emitTaskEvent({
      type: "task:updated",
      task: { ...updatedTask, needsInput: Boolean(updatedTask.needsInput) },
      timestamp: now,
    });

    return NextResponse.json({
      request: resolved,
      task: { ...updatedTask, needsInput: Boolean(updatedTask.needsInput) },
    });
  } catch (error) {
    console.error("POST /api/tasks/[id]/approval-requests/[requestId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
