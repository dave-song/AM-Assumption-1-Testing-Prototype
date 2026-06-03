import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/admin/sessions?key=... — list and export all sessions as JSON.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sessions = await listSessions();
  return NextResponse.json({ count: sessions.length, sessions });
}
