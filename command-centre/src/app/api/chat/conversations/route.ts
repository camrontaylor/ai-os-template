import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertValidClientId } from "@/lib/clients";
import type { Conversation } from "@/types/chat";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (clientId === "root") {
      conditions.push("clientId IS NULL");
    } else if (clientId) {
      conditions.push("clientId = ?");
      params.push(clientId);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(`SELECT * FROM conversations${where} ORDER BY updatedAt DESC LIMIT 20`)
      .all(...params) as Conversation[];

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/chat/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { clientId: rawClientId, title } = body;

    let clientId: string | null;
    try {
      clientId = assertValidClientId(rawClientId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid client selection";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: title || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      clientId,
    };

    db.prepare(
      `INSERT INTO conversations (id, title, status, createdAt, updatedAt, clientId)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      conversation.id,
      conversation.title,
      conversation.status,
      conversation.createdAt,
      conversation.updatedAt,
      conversation.clientId
    );

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("POST /api/chat/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
