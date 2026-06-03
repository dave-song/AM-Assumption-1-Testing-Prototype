// ---------------------------------------------------------------------------
// A1 Socialness Test — data model and capture schema (spec Section 7).
// These types are the source of truth for what the export contains.
// ---------------------------------------------------------------------------

// Team-coded properties. NEVER rendered to the participant; exported for the
// novelty-bias gap analysis (spec principle 4).
export type Property =
  | "visibility" // others can see the user's activity
  | "audience" // a surface where the user is presented to others
  | "obligation" // a reciprocity or response hook
  | "comparison" // others' numbers shown next to the user's
  | "private"; // none of the above; only the user and the app

export interface Announcement {
  title: string;
  body: string;
  delayMs: number; // default 2500
}

export interface CardConfig {
  id: string; // 'C1'..'C8'
  name: string; // internal label, never shown to participant
  caption: string; // neutral participant-facing caption, no construct words
  wireframe: string; // key mapping to a wireframe component
  announcement: Announcement;
  properties: Property[]; // team-coded, hidden, exported
}

export interface AnchorConfig {
  id: string;
  name: string;
  caption: string;
  wireframe: string;
  announcement: Announcement;
  expectedSide: "left" | "right"; // moderator reference only, never shown
}

// --- Per-card captured response -------------------------------------------
export interface CardResponse {
  cardId: string;
  position: number; // index in this session's randomized order
  shownAt: number;
  announcementFiredAt: number | null;
  announcementDismissedAt: number | null; // dismissal latency = hesitation signal
  keep: boolean | null; // true = keep, false = kill
  linePlacement: number | null; // 0 (just me) .. 100 (other people) — first gut reaction
  // Optional re-placement made on the Done debrief, after the participant has
  // seen all cards. null = they didn't move it from its original spot.
  revisedPlacement: number | null;
  familiarity: number | null; // 1 .. 5
  why: string;
  disambiguation: "others" | "unfamiliar" | null;
  answeredAt: number | null;
}

// --- Per-step timing log (spec principle 5: log everything) ----------------
export interface StepTiming {
  step: number;
  name: string;
  enteredAt: number;
  exitedAt: number | null;
}

export interface FacilitatorNote {
  cardId: string | null;
  note: string;
  at: number;
}

export interface Session {
  id: string;
  participantId: string;
  appVersion: string;
  startedAt: number;
  finishedAt: number | null;
  consent: boolean;
  cardOrder: string[]; // the randomized order used
  baseline: { exploredMs: number };
  calibration: { anchorPlacements: { id: string; placement: number }[] };
  cards: CardResponse[];
  compose: { included: string[]; excluded: string[]; stoppedAt: number | null };
  probe: {
    topPick: string | null;
    crossedLine: string[];
    disliked: string[];
    notes: {
      topWhy: string;
      crossedWhy: string;
      watchedFeeling: string;
      offOrIgnore: string;
    };
  };
  facilitatorNotes: FacilitatorNote[];
  stepTimings: StepTiming[];
}
