import { NextRequest, NextResponse } from "next/server";
import { listDirectory, normalizeRelativePath } from "@/lib/file-service";
import { getClientAiOsDir } from "@/lib/config";

const ALLOWED_ROOTS = ["context", "brand_context", "docs", "projects", ".planning", ".claude/skills", "clients"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dirParam = searchParams.get("dir");
    const clientId = searchParams.get("clientId");

    if (!dirParam) {
      return NextResponse.json(
        { error: "dir query parameter is required" },
        { status: 400 }
      );
    }

    const dir = normalizeRelativePath(dirParam);

    // Validate that the requested directory starts with an allowed root
    const isAllowed = ALLOWED_ROOTS.some(
      (root) => dir === root || dir.startsWith(root + "/")
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Access denied: only context and brand_context directories are accessible" },
        { status: 403 }
      );
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const baseDir = getClientAiOsDir(clientId);

    const nodes = listDirectory(dir, { limit, baseDir });
    return NextResponse.json(nodes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
