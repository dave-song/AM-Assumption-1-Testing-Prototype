import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/facilitator { key } — verify the facilitator passcode so the
// in-session control panel can be revealed (spec Section 3).
export async function POST(req: NextRequest) {
  const { key } = (await req.json()) as { key?: string };
  const expected = process.env.FACILITATOR_KEY;
  if (!expected || key !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
