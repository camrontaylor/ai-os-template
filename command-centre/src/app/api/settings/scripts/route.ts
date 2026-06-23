import { NextResponse } from "next/server";
import { SCRIPT_REGISTRY } from "@/lib/script-registry";

export async function GET() {
  return NextResponse.json(SCRIPT_REGISTRY);
}
