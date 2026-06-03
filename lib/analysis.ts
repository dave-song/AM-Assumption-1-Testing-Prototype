import type { CardResponse, Property, Session } from "@/types";
import { cardById, cardName } from "@/config/cards";

// ---------------------------------------------------------------------------
// Downstream analysis helpers shared by the admin view and the CSV export.
// The novelty-bias gap (spec Section 7) compares the participant's stated
// line placement against the team-coded property "social weight".
// ---------------------------------------------------------------------------

// How "socially loaded" a card is by team coding, on a 0..100 scale, so it is
// directly comparable to the participant's 0..100 line placement.
const PROPERTY_WEIGHT: Record<Property, number> = {
  private: 0,
  comparison: 60,
  visibility: 70,
  audience: 85,
  obligation: 90,
};

export function teamSocialScore(properties: Property[]): number {
  if (properties.length === 0) return 0;
  // Use the strongest property as the card's coded social weight.
  return Math.max(...properties.map((p) => PROPERTY_WEIGHT[p]));
}

// Positive gap = participant placed it MORE toward "just me" than the team
// coding implies (i.e. under-weighted the social load — a novelty/familiarity
// effect masking the social signal). Null if no placement captured.
export function noveltyGap(card: CardResponse): number | null {
  if (card.linePlacement === null) return null;
  const cfg = cardById(card.cardId);
  if (!cfg) return null;
  return teamSocialScore(cfg.properties) - card.linePlacement;
}

export function dismissalLatencyMs(card: CardResponse): number | null {
  if (card.announcementFiredAt === null || card.announcementDismissedAt === null)
    return null;
  return card.announcementDismissedAt - card.announcementFiredAt;
}

export function stepDwellMs(session: Session, step: number): number | null {
  const t = session.stepTimings.find((x) => x.step === step);
  if (!t || t.exitedAt === null) return null;
  return t.exitedAt - t.enteredAt;
}

// --- Flatten to CSV (one row per card response + session columns) ----------
const CSV_COLUMNS = [
  "session_id",
  "participant_id",
  "app_version",
  "started_at",
  "finished_at",
  "consent",
  "card_order",
  "baseline_explored_ms",
  "card_position",
  "card_id",
  "card_name",
  "team_properties",
  "team_social_score",
  "shown_at",
  "announcement_fired_at",
  "announcement_dismissed_at",
  "dismissal_latency_ms",
  "keep",
  "line_placement",
  "novelty_gap",
  "familiarity",
  "why",
  "disambiguation",
  "answered_at",
  "compose_included",
  "compose_excluded",
  "compose_included_this_card",
  "probe_top_pick",
  "probe_crossed_line",
  "probe_disliked",
  "probe_top_why",
  "probe_crossed_why",
  "probe_watched_feeling",
  "probe_off_or_ignore",
] as const;

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toIso(ms: number | null): string {
  return ms ? new Date(ms).toISOString() : "";
}

export function sessionsToCsv(sessions: Session[]): string {
  const rows: string[] = [CSV_COLUMNS.join(",")];

  for (const s of sessions) {
    for (const card of s.cards) {
      const cfg = cardById(card.cardId);
      const props = cfg?.properties ?? [];
      const row: Record<(typeof CSV_COLUMNS)[number], unknown> = {
        session_id: s.id,
        participant_id: s.participantId,
        app_version: s.appVersion,
        started_at: toIso(s.startedAt),
        finished_at: toIso(s.finishedAt),
        consent: s.consent,
        card_order: s.cardOrder.join(" "),
        baseline_explored_ms: s.baseline.exploredMs,
        card_position: card.position,
        card_id: card.cardId,
        card_name: cfg ? cfg.name : card.cardId,
        team_properties: props.join("|"),
        team_social_score: teamSocialScore(props),
        shown_at: toIso(card.shownAt),
        announcement_fired_at: toIso(card.announcementFiredAt),
        announcement_dismissed_at: toIso(card.announcementDismissedAt),
        dismissal_latency_ms: dismissalLatencyMs(card) ?? "",
        keep: card.keep === null ? "" : card.keep,
        line_placement: card.linePlacement ?? "",
        novelty_gap: noveltyGap(card) ?? "",
        familiarity: card.familiarity ?? "",
        why: card.why,
        disambiguation: card.disambiguation ?? "",
        answered_at: toIso(card.answeredAt),
        compose_included: s.compose.included.join(" "),
        compose_excluded: s.compose.excluded.join(" "),
        compose_included_this_card: s.compose.included.includes(card.cardId),
        probe_top_pick: s.probe.topPick ?? "",
        probe_crossed_line: s.probe.crossedLine.join(" "),
        probe_disliked: s.probe.disliked.join(" "),
        probe_top_why: s.probe.notes.topWhy,
        probe_crossed_why: s.probe.notes.crossedWhy,
        probe_watched_feeling: s.probe.notes.watchedFeeling,
        probe_off_or_ignore: s.probe.notes.offOrIgnore,
      };
      rows.push(CSV_COLUMNS.map((c) => esc(row[c])).join(","));
    }
  }

  return rows.join("\n");
}

export { cardName };
