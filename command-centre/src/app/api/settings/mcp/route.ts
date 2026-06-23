import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfig } from "@/lib/config";

function getMcpPath(): string {
  return path.join(getConfig().agenticOsDir, ".mcp.json");
}

export async function GET() {
  try {
    const mcpPath = getMcpPath();

    if (!fs.existsSync(mcpPath)) {
      return NextResponse.json({ content: "", exists: false, lastModified: null });
    }

    const content = fs.readFileSync(mcpPath, "utf-8");
    const stat = fs.statSync(mcpPath);

    return NextResponse.json({
      content,
      exists: true,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read .mcp.json";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, lastModified } = body as { content: string; lastModified?: string };

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content must be a string" }, { status: 400 });
    }

    // Validate JSON before saving
    try {
      JSON.parse(content);
    } catch (parseErr) {
      const parseMessage = parseErr instanceof Error ? parseErr.message : "Invalid JSON";
      return NextResponse.json({ error: `Invalid JSON: ${parseMessage}` }, { status: 400 });
    }

    const mcpPath = getMcpPath();

    // Optimistic concurrency check
    if (lastModified && fs.existsSync(mcpPath)) {
      const stat = fs.statSync(mcpPath);
      const currentModified = stat.mtime.toISOString();
      if (currentModified !== lastModified) {
        return NextResponse.json(
          { error: "File was modified since you loaded it. Reload and try again." },
          { status: 409 }
        );
      }
    }

    // Atomic write: write to temp file, then rename
    const tmpPath = mcpPath + ".tmp";
    fs.writeFileSync(tmpPath, content, "utf-8");
    fs.renameSync(tmpPath, mcpPath);

    const stat = fs.statSync(mcpPath);

    return NextResponse.json({
      saved: true,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save .mcp.json";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
