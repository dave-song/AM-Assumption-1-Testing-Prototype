import type { CardResponse, Property, Session } from "@/types";
import { cardById, cardName, cards } from "@/config/cards";

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

// How long the participant took to decide on a feature card: from the moment
// the card was shown to the moment they committed an answer (keep/kill +
// placement). The clearest "time it took to decide" for ranking cards.
export function decisionTimeMs(card: CardResponse): number | null {
  if (card.answeredAt === null) return null;
  return card.answeredAt - card.shownAt;
}

// Pure deliberation time — measured from when the scenario overlay was
// dismissed (so it excludes the fixed scenario delay + reading time) to the
// answer. Useful as a secondary signal next to total decision time.
export function deliberationMs(card: CardResponse): number | null {
  if (card.answeredAt === null || card.announcementDismissedAt === null)
    return null;
  return card.answeredAt - card.announcementDismissedAt;
}

// Cards ranked slowest-first by decision time, dropping any card the
// participant never answered (no decision to time).
export function cardsByDecisionTime(
  session: Session,
): { card: CardResponse; ms: number }[] {
  return session.cards
    .map((card) => ({ card, ms: decisionTimeMs(card) }))
    .filter((x): x is { card: CardResponse; ms: number } => x.ms !== null)
    .sort((a, b) => b.ms - a.ms);
}

// --- Cross-session aggregation (the "All sessions" view) -------------------
// Helpers operate on whatever data exists — a metric is computed only over the
// responses that actually carry it, and `n` reports the sample size so a
// researcher can judge how much to trust each row.

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface CardAggregate {
  cardId: string;
  name: string;
  n: number; // responses where keep/placement was captured
  keepRate: number | null; // 0..1 across answered keep/kill
  meanPlacement: number | null;
  minPlacement: number | null;
  maxPlacement: number | null;
  meanFamiliarity: number | null;
  meanDecisionMs: number | null;
  teamSocialScore: number; // constant per card (team coding)
  meanNoveltyGap: number | null;
  meanRevisionShift: number | null; // debrief re-placement − first placement
}

// One aggregate row per configured feature card, in config order. Pools every
// participant's response to that card across all sessions.
export function aggregateByCard(sessions: Session[]): CardAggregate[] {
  const byCard = new Map<string, CardResponse[]>();
  for (const s of sessions) {
    for (const c of s.cards) {
      const list = byCard.get(c.cardId);
      if (list) list.push(c);
      else byCard.set(c.cardId, [c]);
    }
  }

  return cards.map((cfg) => {
    const resp = byCard.get(cfg.id) ?? [];
    const keepDecisions = resp.filter((c) => c.keep !== null);
    const placements = resp
      .map((c) => c.linePlacement)
      .filter((p): p is number => p !== null);
    const fams = resp
      .map((c) => c.familiarity)
      .filter((f): f is number => f !== null);
    const decisions = resp
      .map((c) => decisionTimeMs(c))
      .filter((d): d is number => d !== null);
    const gaps = resp
      .map((c) => noveltyGap(c))
      .filter((g): g is number => g !== null);
    const shifts = resp
      .map((c) =>
        c.revisedPlacement !== null &&
        c.revisedPlacement !== undefined &&
        c.linePlacement !== null
          ? c.revisedPlacement - c.linePlacement
          : null,
      )
      .filter((s): s is number => s !== null);

    return {
      cardId: cfg.id,
      name: cfg.name,
      n: resp.filter((c) => c.keep !== null || c.linePlacement !== null).length,
      keepRate:
        keepDecisions.length === 0
          ? null
          : keepDecisions.filter((c) => c.keep === true).length /
            keepDecisions.length,
      meanPlacement: mean(placements),
      minPlacement: placements.length ? Math.min(...placements) : null,
      maxPlacement: placements.length ? Math.max(...placements) : null,
      meanFamiliarity: mean(fams),
      meanDecisionMs: decisions.length ? mean(decisions) : null,
      teamSocialScore: teamSocialScore(cfg.properties),
      meanNoveltyGap: mean(gaps),
      meanRevisionShift: shifts.length ? mean(shifts) : null,
    };
  });
}

export interface SessionsOverview {
  total: number;
  completed: number;
  inProgress: number;
  meanCompletionMs: number | null;
  meanCardsAnswered: number | null;
  overallMeanNoveltyGap: number | null;
}

export function sessionsOverview(sessions: Session[]): SessionsOverview {
  const completed = sessions.filter((s) => s.finishedAt !== null);
  const completionTimes = completed
    .map((s) => (s.finishedAt as number) - s.startedAt)
    .filter((ms) => ms > 0);
  const answeredCounts = sessions.map(
    (s) => s.cards.filter((c) => c.keep !== null || c.linePlacement !== null).length,
  );
  const allGaps = sessions.flatMap((s) =>
    s.cards.map((c) => noveltyGap(c)).filter((g): g is number => g !== null),
  );
  return {
    total: sessions.length,
    completed: completed.length,
    inProgress: sessions.length - completed.length,
    meanCompletionMs: completionTimes.length ? mean(completionTimes) : null,
    meanCardsAnswered: sessions.length ? mean(answeredCounts) : null,
    overallMeanNoveltyGap: allGaps.length ? mean(allGaps) : null,
  };
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
  "revised_placement",
  "revision_shift",
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
        revised_placement: card.revisedPlacement ?? "",
        revision_shift:
          card.revisedPlacement !== null &&
          card.revisedPlacement !== undefined &&
          card.linePlacement !== null
            ? card.revisedPlacement - card.linePlacement
            : "",
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
