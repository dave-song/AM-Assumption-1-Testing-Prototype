import { promises as fs } from "fs";
import path from "path";
import type { Session } from "@/types";

// ---------------------------------------------------------------------------
// Server-side session store. Pluggable:
//   - If SUPABASE_URL + key are set  -> Supabase REST (table `sessions`).
//   - Otherwise                      -> local JSON file (.data/sessions.json),
//     which is perfect for the single moderated laptop. On serverless hosts
//     the file store is ephemeral, so configure Supabase for hosted runs.
// No external SDK required — Supabase is reached over its auto REST API.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

export const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

// ---- Local JSON file store -------------------------------------------------
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "sessions.json");

async function readFileStore(): Promise<Record<string, Session>> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Record<string, Session>;
  } catch {
    return {};
  }
}

async function writeFileStore(map: Record<string, Session>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(map, null, 2), "utf8");
}

// ---- Supabase REST helpers -------------------------------------------------
function sbHeaders() {
  return {
    apikey: SUPABASE_KEY as string,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function sbUpsert(session: Session): Promise<void> {
  const body = [
    {
      id: session.id,
      participant_id: session.participantId,
      data: session,
      updated_at: new Date().toISOString(),
    },
  ];
  await fetch(`${SUPABASE_URL}/rest/v1/sessions?on_conflict=id`, {
    method: "POST",
    headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(body),
  });
}

async function sbGet(id: string): Promise<Session | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sessions?id=eq.${id}&select=data`,
    { headers: sbHeaders() },
  );
  const rows = (await res.json()) as { data: Session }[];
  return rows[0]?.data ?? null;
}

async function sbList(): Promise<Session[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sessions?select=data&order=created_at.desc`,
    { headers: sbHeaders() },
  );
  const rows = (await res.json()) as { data: Session }[];
  return rows.map((r) => r.data);
}

// ---- Public API ------------------------------------------------------------
export async function upsertSession(session: Session): Promise<void> {
  if (usingSupabase) return sbUpsert(session);
  const map = await readFileStore();
  map[session.id] = session;
  await writeFileStore(map);
}

export async function getSession(id: string): Promise<Session | null> {
  if (usingSupabase) return sbGet(id);
  const map = await readFileStore();
  return map[id] ?? null;
}

export async function listSessions(): Promise<Session[]> {
  if (usingSupabase) return sbList();
  const map = await readFileStore();
  return Object.values(map).sort((a, b) => b.startedAt - a.startedAt);
}
