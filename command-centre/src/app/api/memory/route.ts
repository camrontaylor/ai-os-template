import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getClientAiOsDir } from "@/lib/config";

/**
 * GET /api/memory?clientId=xxx
 *
 * Surfaces the agent's layered memory for the selected workspace:
 *  - MEMORY.md       the curated working scratchpad (read at session start)
 *  - daily logs      context/memory/{date}.md, most recent first
 *  - learnings.md    accumulated per-skill learnings
 * Read-only. Memory is per-workspace, so it is client-scoped.
 */

const MAX_LOGS = 14;
const MAX_LOG_CHARS = 16000;
const MAX_LEARNINGS_CHARS = 60000;

function readIfExists(p: string, cap?: number): string | null {
  try {
    if (!fs.existsSync(p)) return null;
    let raw = fs.readFileSync(p, "utf-8");
    if (cap && raw.length > cap) raw = raw.slice(0, cap) + "\n\n…(truncated)";
    return raw;
  } catch {
    return null;
  }
}

// Pull a YYYY-MM-DD out of the filename when present, else fall back to name.
function dateFromName(name: string): string {
  const m = name.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : name.replace(/\.md$/, "");
}

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const baseDir = getClientAiOsDir(clientId);
    const contextDir = path.join(baseDir, "context");

    const memory = readIfExists(path.join(contextDir, "MEMORY.md"));
    const learnings = readIfExists(path.join(contextDir, "learnings.md"), MAX_LEARNINGS_CHARS);

    const logsDir = path.join(contextDir, "memory");
    let dailyLogs: { name: string; date: string; content: string }[] = [];
    if (fs.existsSync(logsDir)) {
      const files = fs
        .readdirSync(logsDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, MAX_LOGS);
      dailyLogs = files.map((name) => ({
        name,
        date: dateFromName(name),
        content: readIfExists(path.join(logsDir, name), MAX_LOG_CHARS) || "",
      }));
    }

    return NextResponse.json({
      memory,
      memoryChars: memory ? memory.length : 0,
      learnings,
      dailyLogs,
    });
  } catch (error) {
    console.error("GET /api/memory error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
