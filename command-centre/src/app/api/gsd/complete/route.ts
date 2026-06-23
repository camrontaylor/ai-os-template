import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfig } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { projectSlug } = (await request.json()) as { projectSlug: string };
    if (!projectSlug) {
      return NextResponse.json({ error: "projectSlug is required" }, { status: 400 });
    }

    const baseDir = getConfig().agenticOsDir;
    const briefPath = path.join(baseDir, "projects", "briefs", projectSlug, "brief.md");

    if (!fs.existsSync(briefPath)) {
      return NextResponse.json(
        { error: `No brief found at projects/briefs/${projectSlug}/brief.md` },
        { status: 404 }
      );
    }

    let briefContent = fs.readFileSync(briefPath, "utf-8");
    briefContent = briefContent.replace(
      /^(---\n[\s\S]*?)status:\s*active([\s\S]*?\n---)/,
      "$1status: complete$2"
    );
    fs.writeFileSync(briefPath, briefContent);

    return NextResponse.json({ ok: true, projectSlug });
  } catch (error) {
    console.error("POST /api/gsd/complete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
