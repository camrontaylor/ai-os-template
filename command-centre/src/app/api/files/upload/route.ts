import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  getChatAttachmentExtension,
  getChatAttachmentValidationError,
} from "@/lib/chat-attachment-policy";
import { getConfig } from "@/lib/config";

function runtimeResolve(first: string, ...rest: string[]): string {
  return path.resolve(/*turbopackIgnore: true*/ first, ...rest);
}

function runtimeJoin(first: string, ...rest: string[]): string {
  return path.join(/*turbopackIgnore: true*/ first, ...rest);
}

function isWithinDir(targetPath: string, rootDir: string): boolean {
  const relative = path.relative(rootDir, targetPath);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetDir = formData.get("dir") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = getChatAttachmentExtension(file.name);
    const validationError = getChatAttachmentValidationError(file);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Default to projects/ directory
    const dir = targetDir || "projects";

    // Path traversal protection
    if (dir.includes("..")) {
      return NextResponse.json({ error: "Path traversal not allowed" }, { status: 403 });
    }

    const config = getConfig();
    const resolvedDir = runtimeResolve(config.agenticOsDir, dir);

    if (!isWithinDir(resolvedDir, config.agenticOsDir)) {
      return NextResponse.json({ error: "Path traversal not allowed" }, { status: 403 });
    }

    // Ensure directory exists
    fs.mkdirSync(resolvedDir, { recursive: true });

    // Sanitize filename: keep only safe chars
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const resolvedPath = runtimeJoin(resolvedDir, safeName);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(resolvedPath, buffer);

    const relativePath = path.relative(config.agenticOsDir, resolvedPath);

    return NextResponse.json({
      fileName: safeName,
      filePath: resolvedPath,
      relativePath,
      extension: ext,
      sizeBytes: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
