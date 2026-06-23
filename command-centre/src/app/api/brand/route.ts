import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getClientAiOsDir } from "@/lib/config";

export interface BrandFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const baseDir = getClientAiOsDir(clientId);
    const brandDir = path.join(baseDir, "brand_context");

    if (!fs.existsSync(brandDir)) {
      return NextResponse.json([]);
    }

    const entries = fs.readdirSync(brandDir);
    const files: BrandFile[] = entries
      .filter((name) => name.endsWith(".md"))
      .map((name) => {
        const fullPath = path.join(brandDir, name);
        const stat = fs.statSync(fullPath);
        return {
          name,
          path: name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        };
      });

    return NextResponse.json(files);
  } catch (error) {
    console.error("GET /api/brand error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
