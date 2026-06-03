import { NextRequest, NextResponse } from "next/server";
import { listSessions, storeHealth } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/admin/sessions?key=... — list and export all sessions as JSON,
// plus the backend health so the moderator can confirm data is being saved
// durably before running hosted sessions.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const health = await storeHealth();
  try {
    const sessions = await listSessions();
    return NextResponse.json({ count: sessions.length, sessions, store: health });
  } catch (e) {
    // Surface a store error instead of pretending there are zero sessions.
    return NextResponse.json(
      {
        count: 0,
        sessions: [],
        store: {
          ...health,
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        },
      },
      { status: 200 },
    );
  }
}
