import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Message } from "@/types/chat";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const rows = db
      .prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC")
      .all(id) as Array<Record<string, unknown>>;

    // Parse metadata JSON
    const messages: Message[] = rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
    })) as Message[];

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/chat/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
