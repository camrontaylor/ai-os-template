import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfig } from "@/lib/config";

/**
 * GET /api/skills/library
 *
 * The skills library is the staging area for candidate skills before they
 * go live: backlog -> triage -> review -> live. It is inert (never auto
 * loaded), so the only runtime-readable view is skills-library/INDEX.md.
 * We parse that index into structured candidates so the UI can show the
 * pipeline. Read-only.
 */

interface LibrarySkill {
  name: string;
  category: string;
  description: string;
  dupe: boolean;
  triggers: string[];
  source: string;
  stage: "backlog" | "triage" | "review" | "live";
}

function stageFromHeading(heading: string): LibrarySkill["stage"] | null {
  const h = heading.toLowerCase();
  if (h.startsWith("triage")) return "triage";
  if (h.startsWith("review")) return "review";
  if (h.startsWith("backlog")) return "backlog";
  if (h.startsWith("live") || h.startsWith("promoted")) return "live";
  return null;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseIndex(md: string): { candidates: LibrarySkill[]; builtNote: string } {
  const lines = md.split("\n");
  const candidates: LibrarySkill[] = [];
  let stage: LibrarySkill["stage"] | null = null;
  let category = "";
  let builtNote = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("_Built") || trimmed.startsWith("_built")) {
      builtNote = trimmed.replace(/^_/, "").replace(/_$/, "").trim();
      continue;
    }

    const h2 = trimmed.match(/^##\s+(.+)/);
    if (h2) {
      stage = stageFromHeading(h2[1]);
      category = "";
      continue;
    }

    // "### Security (sec)" -> category label + code
    const h3 = trimmed.match(/^###\s+(.+?)(?:\s*\(([^)]+)\))?\s*$/);
    if (h3) {
      category = (h3[2] || h3[1]).trim();
      continue;
    }

    if (!stage) continue;
    if (!trimmed.startsWith("|")) continue;

    const cols = splitRow(trimmed);
    if (cols.length < 3) continue;
    // skip header + separator rows
    const first = cols[0].toLowerCase();
    if (first === "skill" || /^:?-{2,}/.test(cols[0])) continue;

    const name = cols[0];
    if (!name) continue;

    candidates.push({
      name,
      category: (cols[1] || category || "misc").toLowerCase(),
      description: cols[2] || "",
      dupe: /yes/i.test(cols[3] || ""),
      triggers: (cols[4] || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      source: cols[5] || "",
      stage,
    });
  }

  return { candidates, builtNote };
}

export async function GET() {
  try {
    const root = getConfig().agenticOsDir;
    const indexPath = path.join(root, "skills-library", "INDEX.md");

    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ candidates: [], stageCounts: {}, builtNote: "" });
    }

    const md = fs.readFileSync(indexPath, "utf-8");
    const { candidates, builtNote } = parseIndex(md);

    const stageCounts: Record<string, number> = { backlog: 0, triage: 0, review: 0, live: 0 };
    for (const c of candidates) stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;

    return NextResponse.json({ candidates, stageCounts, builtNote });
  } catch (error) {
    console.error("GET /api/skills/library error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
