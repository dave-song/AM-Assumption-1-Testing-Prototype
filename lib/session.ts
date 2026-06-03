import { v4 as uuid } from "uuid";
import type { CardResponse, Session, StepTiming } from "@/types";
import { APP_VERSION, cards } from "@/config/cards";
import { shuffle } from "@/lib/randomize";

// ---------------------------------------------------------------------------
// Client-side session engine: create, autosave (localStorage), resume, export.
// localStorage is the source of truth on the session device, so the tool is
// fully functional with no backend. A best-effort PUT mirrors to the API.
// ---------------------------------------------------------------------------

const INDEX_KEY = "a1_sessions_index";
const sessionKey = (id: string) => `a1_session_${id}`;

export const STEPS = [
  "Setup & consent",
  "Baseline",
  "Line intro",
  "Calibration",
  "Card loop",
  "Compose",
  "Probe",
  "Done",
] as const;

function emptyCardResponse(cardId: string, position: number): CardResponse {
  return {
    cardId,
    position,
    shownAt: 0,
    announcementFiredAt: null,
    announcementDismissedAt: null,
    keep: null,
    linePlacement: null,
    familiarity: null,
    why: "",
    disambiguation: null,
    answeredAt: null,
  };
}

export function createSession(
  participantId: string,
  now: number,
  options?: { fixedOrder?: string[]; seed?: number },
): Session {
  const order =
    options?.fixedOrder && options.fixedOrder.length === cards.length
      ? options.fixedOrder
      : shuffle(
          cards.map((c) => c.id),
          options?.seed,
        );

  return {
    id: uuid(),
    participantId: participantId.trim() || `P-${now}`,
    appVersion: APP_VERSION,
    startedAt: now,
    finishedAt: null,
    consent: false,
    cardOrder: order,
    baseline: { exploredMs: 0 },
    calibration: { anchorPlacements: [] },
    cards: order.map((id, i) => emptyCardResponse(id, i)),
    compose: { included: [], excluded: [], stoppedAt: null },
    probe: {
      topPick: null,
      crossedLine: [],
      disliked: [],
      notes: { topWhy: "", crossedWhy: "", watchedFeeling: "", offOrIgnore: "" },
    },
    facilitatorNotes: [],
    stepTimings: [],
  };
}

// --- localStorage registry --------------------------------------------------
function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export function saveLocal(session: Session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(sessionKey(session.id), JSON.stringify(session));
  const ids = readIndex();
  if (!ids.includes(session.id)) writeIndex([...ids, session.id]);
}

export function loadLocal(id: string): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(sessionKey(id));
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function listLocal(): Session[] {
  return readIndex()
    .map((id) => loadLocal(id))
    .filter((s): s is Session => s !== null)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function findUnfinishedLocal(): Session | null {
  return listLocal().find((s) => s.finishedAt === null) ?? null;
}

// --- Step timing log --------------------------------------------------------
export function enterStep(session: Session, step: number, now: number): Session {
  const timings: StepTiming[] = [...session.stepTimings];
  const open = timings.find((t) => t.step === step && t.exitedAt === null);
  if (!open) {
    timings.push({ step, name: STEPS[step] ?? `step ${step}`, enteredAt: now, exitedAt: null });
  }
  return { ...session, stepTimings: timings };
}

export function exitStep(session: Session, step: number, now: number): Session {
  const timings = session.stepTimings.map((t) =>
    t.step === step && t.exitedAt === null ? { ...t, exitedAt: now } : t,
  );
  return { ...session, stepTimings: timings };
}

// --- Best-effort server mirror (autosave upsert) ---------------------------
export async function syncRemote(session: Session): Promise<void> {
  try {
    await fetch(`/api/session/${session.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
      keepalive: true,
    });
  } catch {
    // Offline / no backend configured — localStorage remains source of truth.
  }
}

// --- Export -----------------------------------------------------------------
export function downloadJSON(session: Session) {
  const blob = new Blob([JSON.stringify(session, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `a1_session_${session.participantId}_${session.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
