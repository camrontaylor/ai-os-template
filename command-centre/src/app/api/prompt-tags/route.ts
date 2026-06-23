import { NextRequest, NextResponse } from "next/server";
import { loadPromptTags } from "@/lib/prompt-tags";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const tags = loadPromptTags(clientId);
  return NextResponse.json({ tags });
}
