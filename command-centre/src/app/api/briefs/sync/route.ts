import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "@/lib/file-service";
import { getDb } from "@/lib/db";
import { getClientAiOsDir } from "@/lib/config";
import {
  parseDeliverables,
  appendDeliverable,
  findNewDeliverables,
  toggleDeliverableCheckbox,
} from "@/lib/brief-sync";
import crypto from "crypto";

/**
 * POST /api/briefs/sync
 *
 * Two operations:
 *
 * 1. action: "sync-deliverables-to-tasks"
 *    Reads the brief, finds deliverables that don't have matching subtasks,
 *    creates tasks for them.
 *
 * 2. action: "add-to-brief"
 *    Appends a new deliverable line to the brief and optionally returns updated content.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectSlug, parentId, clientId } = body as {
      action: string;
      projectSlug: string;
      parentId: string;
      clientId?: string | null;
    };

    if (!projectSlug) {
      return NextResponse.json({ error: "projectSlug is required" }, { status: 400 });
    }

    const baseDir = getClientAiOsDir(clientId ?? null);
    const briefPath = `projects/briefs/${projectSlug}/brief.md`;

    if (action === "sync-deliverables-to-tasks") {
      // Read the brief
      let briefContent: string;
      try {
        const file = readFile(briefPath, baseDir);
        briefContent = file.content;
      } catch {
        return NextResponse.json({ error: "Brief not found" }, { status: 404 });
      }

      const deliverables = parseDeliverables(briefContent);
      if (deliverables.length === 0) {
        return NextResponse.json({ created: [], message: "No deliverables found in brief" });
      }

      // Get existing child task titles
      const db = getDb();
      const existingTasks = db
        .prepare("SELECT title FROM tasks WHERE parentId = ? OR (projectSlug = ? AND id != ?)")
        .all(parentId, projectSlug, parentId) as { title: string }[];

      const newDeliverables = findNewDeliverables(
        deliverables,
        existingTasks.map((t) => t.title),
      );

      if (newDeliverables.length === 0) {
        return NextResponse.json({ created: [], message: "All deliverables already have matching tasks" });
      }

      // Create tasks for new deliverables
      const now = new Date().toISOString();
      const created: { id: string; title: string }[] = [];
      const maxOrder = (
        db.prepare("SELECT MAX(columnOrder) as m FROM tasks WHERE parentId = ?").get(parentId) as { m: number | null }
      )?.m ?? 0;

      for (let i = 0; i < newDeliverables.length; i++) {
        const id = crypto.randomUUID();
        const title = newDeliverables[i];
        db.prepare(
          `INSERT INTO tasks (id, title, description, status, level, parentId, projectSlug, columnOrder, createdAt, updatedAt, needsInput, clientId)
           VALUES (?, ?, ?, 'backlog', 'task', ?, ?, ?, ?, ?, 0, ?)`
        ).run(id, title, null, parentId, projectSlug, maxOrder + i + 1, now, now, clientId ?? null);
        created.push({ id, title });
      }

      return NextResponse.json({ created });

    } else if (action === "add-to-brief") {
      const { deliverable } = body as { deliverable: string };
      if (!deliverable) {
        return NextResponse.json({ error: "deliverable is required" }, { status: 400 });
      }

      // Read current brief
      let briefContent: string;
      let lastModified: string | undefined;
      try {
        const file = readFile(briefPath, baseDir);
        briefContent = file.content;
        lastModified = file.lastModified;
      } catch {
        return NextResponse.json({ error: "Brief not found" }, { status: 404 });
      }

      // Append the new deliverable
      const updatedContent = appendDeliverable(briefContent, deliverable);
      writeFile(briefPath, updatedContent, lastModified, baseDir);

      return NextResponse.json({ success: true });

    } else if (action === "mark-deliverable") {
      const { subtaskTitle, checked } = body as { subtaskTitle: string; checked: boolean };
      if (!subtaskTitle) {
        return NextResponse.json({ error: "subtaskTitle is required" }, { status: 400 });
      }

      // Read current brief
      let briefContent: string;
      let lastModified: string | undefined;
      try {
        const file = readFile(briefPath, baseDir);
        briefContent = file.content;
        lastModified = file.lastModified;
      } catch {
        return NextResponse.json({ error: "Brief not found" }, { status: 404 });
      }

      const updatedContent = toggleDeliverableCheckbox(briefContent, subtaskTitle, checked ?? true);
      if (updatedContent !== briefContent) {
        writeFile(briefPath, updatedContent, lastModified, baseDir);
      }

      return NextResponse.json({ success: true });

    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
