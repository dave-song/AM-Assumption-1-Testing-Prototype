import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/store";
import { sessionsToCsv } from "@/lib/analysis";

export const dynamic = "force-dynamic";

// GET /api/admin/export.csv?key=... — flattened CSV (one row per card response).
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const csv = sessionsToCsv(await listSessions());
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="a1_sessions.csv"`,
    },
  });
}
