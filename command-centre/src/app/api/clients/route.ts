import { NextResponse } from "next/server";
import { detectClients, getRootName, getWorkspaceId } from "../../../lib/clients";

export async function GET() {
  try {
    const clients = detectClients();
    const rootName = getRootName();
    const workspaceId = getWorkspaceId();
    return NextResponse.json({ clients, rootName, workspaceId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to detect clients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
