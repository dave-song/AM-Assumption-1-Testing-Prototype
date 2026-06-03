import { NextRequest, NextResponse } from "next/server";
import type { Session } from "@/types";
import { getSession, upsertSession } from "@/lib/store";

export const dynamic = "force-dynamic";

// PUT /api/session/[id] — upsert the full session object (autosave).
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = (await req.json()) as Session;
  if (session?.id !== params.id) {
    return NextResponse.json({ error: "id mismatch" }, { status: 400 });
  }
  await upsertSession(session);
  return NextResponse.json({ ok: true });
}

// GET /api/session/[id] — fetch (resume).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(params.id);
  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}
