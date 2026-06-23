import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, deleteFile, moveFile, normalizeRelativePath } from "@/lib/file-service";
import { getClientAiOsDir } from "@/lib/config";

const ALLOWED_ROOTS = ["context", "brand_context", "docs", "projects", ".planning", ".claude/skills", "clients"];
const ALLOWED_ROOT_FILES = ["AGENTS.md", "CLAUDE.md", "README.md"];

function validateFilePath(segments: string[]): string | null {
  const filePath = normalizeRelativePath(segments.join("/"));
  // Allow specific root-level files
  if (ALLOWED_ROOT_FILES.includes(filePath)) return filePath;
  const isAllowed = ALLOWED_ROOTS.some(
    (root) => filePath === root || filePath.startsWith(root + "/")
  );
  if (!isAllowed) return null;
  return filePath;
}

function getBaseDir(request: NextRequest): string {
  const clientId = request.nextUrl.searchParams.get("clientId");
  return getClientAiOsDir(clientId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = validateFilePath(segments);
    if (!filePath) {
      return NextResponse.json(
        { error: "Access denied: only context and brand_context files are accessible" },
        { status: 403 }
      );
    }

    const file = readFile(filePath, getBaseDir(request));
    return NextResponse.json(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = validateFilePath(segments);
    if (!filePath) {
      return NextResponse.json(
        { error: "Access denied: only context and brand_context files are accessible" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, lastModified } = body as { content: string; lastModified?: string };

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required and must be a string" },
        { status: 400 }
      );
    }

    const result = writeFile(filePath, content, lastModified, getBaseDir(request));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("modified since you loaded") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const fromPath = validateFilePath(segments);
    if (!fromPath) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { destination } = body as { destination: string };

    if (!destination || typeof destination !== "string") {
      return NextResponse.json(
        { error: "destination is required" },
        { status: 400 }
      );
    }

    // Validate destination path
    const destSegments = normalizeRelativePath(destination).split("/");
    const destPath = validateFilePath(destSegments);
    if (!destPath) {
      return NextResponse.json(
        { error: "Access denied: invalid destination" },
        { status: 403 }
      );
    }

    moveFile(fromPath, destPath, getBaseDir(request));
    return NextResponse.json({ moved: true, from: fromPath, to: destPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = validateFilePath(segments);
    if (!filePath) {
      return NextResponse.json(
        { error: "Access denied: only context and brand_context files are accessible" },
        { status: 403 }
      );
    }

    deleteFile(filePath, getBaseDir(request));
    return NextResponse.json({ deleted: true, path: filePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
