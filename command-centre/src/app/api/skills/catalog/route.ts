import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfig } from "@/lib/config";

/**
 * GET /api/skills/catalog
 *
 * The catalog is the registry of installable skills shipped with AI-OS.
 * It lives at .claude/skills/_catalog/catalog.json (shared at the root).
 * We diff it against installed.json so the UI can show what is already in
 * and what can still be added. This is read-only; installing a skill is
 * done from the terminal (scripts/add-skill.sh), which the UI surfaces.
 */
export async function GET() {
  try {
    const root = getConfig().agenticOsDir;
    const catalogPath = path.join(root, ".claude", "skills", "_catalog", "catalog.json");
    const installedPath = path.join(root, ".claude", "skills", "_catalog", "installed.json");

    if (!fs.existsSync(catalogPath)) {
      return NextResponse.json({ version: null, skills: [] });
    }

    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    let installedNames: string[] = [];
    try {
      const installed = JSON.parse(fs.readFileSync(installedPath, "utf-8"));
      installedNames = Array.isArray(installed.installed_skills) ? installed.installed_skills : [];
    } catch {
      /* installed.json optional */
    }

    const coreSkills: string[] = Array.isArray(catalog.core_skills) ? catalog.core_skills : [];
    const skillsObj = catalog.skills && typeof catalog.skills === "object" ? catalog.skills : {};

    const skills = Object.entries(skillsObj).map(([name, raw]) => {
      const s = raw as Record<string, unknown>;
      return {
        name,
        category: (s.category as string) || name.split("-")[0],
        version: (s.version as string) || "",
        description: (s.description as string) || "",
        requiresServices: Array.isArray(s.requires_services) ? (s.requires_services as string[]) : [],
        dependencies: Array.isArray(s.dependencies) ? (s.dependencies as string[]) : [],
        mcpServers: Array.isArray(s.mcp_servers) ? (s.mcp_servers as string[]) : [],
        installed: installedNames.includes(name),
        core: coreSkills.includes(name),
      };
    });

    skills.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      version: (catalog.version as string) || null,
      installedCount: installedNames.length,
      skills,
    });
  } catch (error) {
    console.error("GET /api/skills/catalog error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
