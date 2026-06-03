import { NextRequest, NextResponse } from "next/server";
import type { Session } from "@/types";
import { upsertSession } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/session — create (persist) a session, returns id.
export async function POST(req: NextRequest) {
  const session = (await req.json()) as Session;
  if (!session?.id) {
    return NextResponse.json({ error: "missing session id" }, { status: 400 });
  }
  await upsertSession(session);
  return NextResponse.json({ id: session.id });
}
