import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getClientAiOsDir } from "@/lib/config";
import { parseDependencies } from "@/lib/file-service";
import { parseMarkdownFrontmatter } from "@/lib/frontmatter";
import type { InstalledSkill } from "@/types/file";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const baseDir = getClientAiOsDir(clientId);
    const skillsDir = path.join(baseDir, ".claude", "skills");

    if (!fs.existsSync(skillsDir)) {
      return NextResponse.json([]);
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: InstalledSkill[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "_catalog") continue;

      const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillMdPath)) continue;

      try {
        const raw = fs.readFileSync(skillMdPath, "utf-8");
        const { data, content } = parseMarkdownFrontmatter(raw);

        skills.push({
          name: (data.name as string) || entry.name,
          category: entry.name.split("-")[0],
          description: (data.description as string) || "",
          triggers: (data.triggers as string[]) || [],
          folderName: entry.name,
          dependencies: parseDependencies(content),
        });
      } catch {
        skills.push({
          name: entry.name,
          category: entry.name.split("-")[0],
          description: "",
          triggers: [],
          folderName: entry.name,
          dependencies: [],
        });
      }
    }

    return NextResponse.json(skills);
  } catch (error) {
    console.error("GET /api/skills error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
