"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@/types";
import { listLocal, removeLocal, STEPS } from "@/lib/session";
import type { StoreHealth } from "@/lib/store";
import {
  aggregateByCard,
  cardsByDecisionTime,
  decisionTimeMs,
  dismissalLatencyMs,
  noveltyGap,
  sessionsOverview,
  sessionsToCsv,
  stepDwellMs,
  teamSocialScore,
  type CardAggregate,
} from "@/lib/analysis";
import { cardById } from "@/config/cards";

const STEP_NAMES = STEPS;

// ---------------------------------------------------------------------------
// Researcher / moderator logging view (spec Section 3 + 9). Passcode-gated.
// Lists every session and shows ALL captured data — placements, keep/kill,
// familiarity, reasons, timings, dismissal latency, the hidden team-coded
// properties, and the computed novelty-bias gap — plus JSON and CSV export.
//
// Sessions are merged from the server (all devices) and this device's
// localStorage, de-duplicated by id, so the log is complete even offline.
// ---------------------------------------------------------------------------

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function fmtTime(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : "—";
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<StoreHealth | null>(null);
  const [view, setView] = useState<"aggregate" | "session">("aggregate");

  const load = async () => {
    setLoading(true);
    setError("");
    let server: Session[] = [];
    try {
      const res = await fetch(`/api/admin/sessions?key=${encodeURIComponent(key)}`);
      if (res.status === 401) {
        setError("Incorrect admin key.");
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as {
          sessions: Session[];
          store?: StoreHealth;
        };
        server = data.sessions ?? [];
        setStore(data.store ?? null);
      }
    } catch {
      // server unavailable — fall back to local only
    }

    const local = listLocal();
    const byId = new Map<string, Session>();
    for (const s of [...server, ...local]) {
      // Prefer the most recently updated copy.
      const existing = byId.get(s.id);
      if (!existing || (s.finishedAt ?? s.startedAt) >= (existing.finishedAt ?? existing.startedAt)) {
        byId.set(s.id, s);
      }
    }
    const merged = [...byId.values()].sort((a, b) => b.startedAt - a.startedAt);
    setSessions(merged);
    setSelected(merged[0]?.id ?? null);
    setLoading(false);
  };

  const current = useMemo(
    () => sessions?.find((s) => s.id === selected) ?? null,
    [sessions, selected],
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Permanently delete one session (e.g. a test run) from the server store and
  // this device's localStorage. Gated by the same admin key used to unlock.
  const deleteSession = async (s: Session) => {
    const label = s.participantId || s.id.slice(0, 8);
    if (
      !window.confirm(
        `Delete session "${label}"? This permanently removes its data and cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(s.id);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/sessions?key=${encodeURIComponent(key)}&id=${encodeURIComponent(s.id)}`,
        { method: "DELETE" },
      );
      if (res.status === 401) {
        setError("Incorrect admin key.");
        setDeletingId(null);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete session.");
        setDeletingId(null);
        return;
      }
    } catch {
      // Server unavailable — still drop the local copy below.
    }
    removeLocal(s.id);
    setSessions((prev) => {
      const next = (prev ?? []).filter((x) => x.id !== s.id);
      setSelected((cur) => (cur === s.id ? next[0]?.id ?? null : cur));
      return next;
    });
    setDeletingId(null);
  };

  const downloadJSON = () => {
    if (!sessions) return;
    const blob = new Blob([JSON.stringify(sessions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "a1_sessions.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!sessions) return;
    const blob = new Blob([sessionsToCsv(sessions)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "a1_sessions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Gate ----------------------------------------------------------------
  if (!sessions) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <span className="wire-label">researcher · session log</span>
        <input
          type="password"
          className="wire-input"
          placeholder="admin key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        {error ? <p className="font-mono text-xs text-red-600">{error}</p> : null}
        <button className="wire-btn-primary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Unlock"}
        </button>
        <Link href="/" className="font-mono text-xs text-wire-muted underline">
          ← back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <span className="wire-label">researcher · session log</span>
          <h1 className="font-mono text-lg text-wire-ink">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="wire-btn" onClick={downloadJSON}>
            Export all JSON
          </button>
          <button className="wire-btn" onClick={downloadCSV}>
            Export CSV
          </button>
          <a
            className="wire-btn"
            href={`/api/admin/export.csv?key=${encodeURIComponent(key)}`}
          >
            Server CSV
          </a>
          <Link href="/" className="wire-btn">
            New session
          </Link>
        </div>
      </header>

      {/* Backend status — confirms participant data is being saved durably.
          On a hosted deploy this MUST read "Connected to Supabase". */}
      {store ? (
        <div
          className={`mb-6 border p-3 font-mono text-xs print:hidden ${
            store.durable
              ? "border-wire-line bg-wire-box text-wire-ink"
              : "border-red-600 bg-red-50 text-red-700"
          }`}
        >
          <strong>
            {store.durable ? "● storage ok" : "▲ storage warning"}
          </strong>{" "}
          — {store.detail}
        </div>
      ) : null}

      {/* View tabs — aggregate insights across all sessions vs one session. */}
      <div className="mb-6 flex gap-px border-b border-wire-border print:hidden">
        <TabButton
          active={view === "aggregate"}
          onClick={() => setView("aggregate")}
        >
          All sessions
        </TabButton>
        <TabButton
          active={view === "session"}
          onClick={() => setView("session")}
        >
          By session
        </TabButton>
      </div>

      {view === "aggregate" ? (
        <AllSessionsView sessions={sessions} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr] print:block">
          {/* Session list */}
          <aside className="space-y-1 print:hidden">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`flex items-stretch border ${
                  selected === s.id
                    ? "border-wire-ink bg-wire-box"
                    : "border-wire-border bg-white"
                }`}
              >
                <button
                  onClick={() => setSelected(s.id)}
                  className="min-w-0 flex-1 p-2 text-left"
                >
                  <div className="truncate font-mono text-sm text-wire-ink">
                    {s.participantId}
                  </div>
                  <div className="font-mono text-[11px] text-wire-muted">
                    {fmtTime(s.startedAt)} ·{" "}
                    {s.finishedAt ? "complete" : "in progress"}
                  </div>
                </button>
                <button
                  onClick={() => deleteSession(s)}
                  disabled={deletingId === s.id}
                  title="Delete this session"
                  aria-label={`Delete session ${s.participantId}`}
                  className="shrink-0 border-l border-wire-border px-2 font-mono text-xs text-wire-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === s.id ? "…" : "✕"}
                </button>
              </div>
            ))}
          </aside>

          {/* Detail */}
          <section>
            {current ? <SessionDetail session={current} /> : null}
          </section>
        </div>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 font-mono text-sm ${
        active
          ? "border-wire-ink text-wire-ink"
          : "border-transparent text-wire-muted hover:text-wire-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SessionDetail({ session: s }: { session: Session }) {
  const completeMs =
    s.finishedAt !== null ? s.finishedAt - s.startedAt : null;

  // Download just this one session as JSON (vs the "Export all JSON" button,
  // which dumps every session in the log).
  const downloadSessionJSON = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `a1_session_${s.participantId || "anon"}_${s.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export the full visual + in-depth report as a PDF via the browser's print
  // pipeline. The app chrome is hidden in print (Tailwind `print:hidden`), so
  // the print dialog → "Save as PDF" yields just this session's report.
  const downloadReportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Per-session toolbar — hidden when printing the report. */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h2 className="font-mono text-base text-wire-ink">
          {s.participantId}{" "}
          <span className="text-wire-muted">· {s.id.slice(0, 8)}</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <button className="wire-btn" onClick={downloadSessionJSON}>
            Download JSON
          </button>
          <button className="wire-btn-primary" onClick={downloadReportPDF}>
            Download report (PDF)
          </button>
        </div>
      </div>

      {/* Print-only report header — shows only in the exported PDF. */}
      <div className="hidden print:block">
        <span className="wire-label">a1 socialness test · session report</span>
        <h1 className="font-mono text-xl text-wire-ink">
          {s.participantId}
        </h1>
        <p className="font-mono text-xs text-wire-muted">
          session {s.id.slice(0, 8)} · started {fmtTime(s.startedAt)}
          {s.finishedAt ? ` · ${fmtMs(completeMs)} total` : " · in progress"}
        </p>
      </div>

      {/* Visual insights — charts before the raw tables. */}
      <InsightCharts session={s} />

      {/* Summary */}
      <div className="border border-wire-border bg-white p-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-xs text-wire-ink sm:grid-cols-3">
          <Field label="participant" value={s.participantId} />
          <Field label="session id" value={s.id.slice(0, 8)} />
          <Field label="app version" value={s.appVersion} />
          <Field label="consent" value={s.consent ? "yes" : "no"} />
          <Field label="started" value={fmtTime(s.startedAt)} />
          <Field label="finished" value={fmtTime(s.finishedAt)} />
          <Field label="total time" value={fmtMs(completeMs)} />
          <Field label="card order" value={s.cardOrder.join(" ")} />
          <Field
            label="baseline explore"
            value={fmtMs(s.baseline.exploredMs)}
          />
        </div>
      </div>

      {/* Calibration */}
      <Panel title="Calibration anchors">
        <div className="flex flex-wrap gap-4">
          {s.calibration.anchorPlacements.map((a) => (
            <div key={a.id} className="font-mono text-xs">
              <span className="text-wire-muted">{a.id}: </span>
              <span className="text-wire-ink">{a.placement}</span>
            </div>
          ))}
          {s.calibration.anchorPlacements.length === 0 && <Empty />}
        </div>
      </Panel>

      {/* Per-card table — the heart of the log */}
      <Panel title="Card responses">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-wire-border text-left text-wire-muted">
                <Th>#</Th>
                <Th>card</Th>
                <Th>keep</Th>
                <Th title="first gut-reaction placement">line</Th>
                <Th title="re-placement made on the Done debrief, and the shift">
                  revised
                </Th>
                <Th>fam</Th>
                <Th>disambig</Th>
                <Th title="time from card shown to answer committed">decide</Th>
                <Th>dismiss</Th>
                <Th title="hidden team-coded properties">team props</Th>
                <Th title="team social score − line placement">novelty gap</Th>
              </tr>
            </thead>
            <tbody>
              {s.cards.map((c) => {
                const cfg = cardById(c.cardId);
                const gap = noveltyGap(c);
                return (
                  <React.Fragment key={c.cardId}>
                    <tr className="align-top">
                    <Td>{c.position + 1}</Td>
                    <Td>
                      <span className="text-wire-ink">{cfg?.name ?? c.cardId}</span>
                    </Td>
                    <Td>
                      {c.keep === null ? "—" : c.keep ? "keep" : "kill"}
                    </Td>
                    <Td>{c.linePlacement ?? "—"}</Td>
                    <Td>
                      {c.revisedPlacement === null ||
                      c.revisedPlacement === undefined ? (
                        "—"
                      ) : (
                        <span className="text-wire-ink">
                          {c.revisedPlacement}
                          {c.linePlacement !== null
                            ? ` (${c.revisedPlacement - c.linePlacement >= 0 ? "+" : ""}${c.revisedPlacement - c.linePlacement})`
                            : ""}
                        </span>
                      )}
                    </Td>
                    <Td>{c.familiarity ?? "—"}</Td>
                    <Td>{c.disambiguation ?? "—"}</Td>
                    <Td>{fmtMs(decisionTimeMs(c))}</Td>
                    <Td>{fmtMs(dismissalLatencyMs(c))}</Td>
                    <Td>
                      <span className="text-wire-muted">
                        {cfg?.properties.join(", ")}
                      </span>
                      <span className="ml-1 text-wire-ink">
                        ({cfg ? teamSocialScore(cfg.properties) : "—"})
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={
                          gap !== null && gap >= 20
                            ? "font-bold text-red-700"
                            : "text-wire-ink"
                        }
                      >
                        {gap ?? "—"}
                      </span>
                    </Td>
                    </tr>
                    {/* "why" spans the full table width on its own row so the
                        long free-text answer is readable instead of cramped
                        into a narrow column. */}
                    <tr className="border-b border-wire-border/50">
                      <td colSpan={11} className="px-2 pb-3 pt-0 align-top">
                        <span className="text-wire-muted">why: </span>
                        <span className="whitespace-pre-wrap text-wire-ink">
                          {c.why || "—"}
                        </span>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[10px] text-wire-muted">
          Novelty gap = team social score (0–100) − participant line placement.
          A large positive gap flags a feature the participant placed as
          &quot;just me&quot; despite being socially loaded by team coding.
        </p>
      </Panel>

      {/* Compose */}
      <Panel title="Compose your own">
        <div className="space-y-1 font-mono text-xs">
          <div>
            <span className="text-wire-muted">included: </span>
            <span className="text-wire-ink">
              {s.compose.included.map((id) => cardById(id)?.name ?? id).join(", ") ||
                "—"}
            </span>
          </div>
          <div>
            <span className="text-wire-muted">excluded: </span>
            <span className="text-wire-ink">
              {s.compose.excluded.map((id) => cardById(id)?.name ?? id).join(", ") ||
                "—"}
            </span>
          </div>
          <div>
            <span className="text-wire-muted">stopped at: </span>
            <span className="text-wire-ink">{fmtTime(s.compose.stoppedAt)}</span>
          </div>
        </div>
      </Panel>

      {/* Probe */}
      <Panel title="Probe and reasoning">
        <div className="space-y-2 font-mono text-xs">
          <div>
            <span className="text-wire-muted">top pick: </span>
            <span className="text-wire-ink">
              {s.probe.topPick
                ? cardById(s.probe.topPick)?.name ?? s.probe.topPick
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-wire-muted">crossed a line: </span>
            <span className="text-wire-ink">
              {s.probe.crossedLine.map((id) => cardById(id)?.name ?? id).join(", ") ||
                "—"}
            </span>
          </div>
          <div>
            <span className="text-wire-muted">would skip: </span>
            <span className="text-wire-ink">
              {s.probe.disliked.map((id) => cardById(id)?.name ?? id).join(", ") ||
                "—"}
            </span>
          </div>
          <Note label="top felt right" value={s.probe.notes.topWhy} />
          <Note label="crossed a line" value={s.probe.notes.crossedWhy} />
          <Note label="watched/expected" value={s.probe.notes.watchedFeeling} />
          <Note label="off or ignore" value={s.probe.notes.offOrIgnore} />
        </div>
      </Panel>

      {/* Timings */}
      <Panel title="Step timings">
        <table className="w-full font-mono text-[11px]">
          <tbody>
            {s.stepTimings.map((t) => (
              <tr key={t.step} className="border-b border-wire-border/50">
                <Td>{STEP_NAMES[t.step] ?? `step ${t.step}`}</Td>
                <Td>{fmtTime(t.enteredAt)}</Td>
                <Td>{fmtMs(stepDwellMs(s, t.step))}</Td>
              </tr>
            ))}
            {s.stepTimings.length === 0 && (
              <tr>
                <Td>
                  <Empty />
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* Facilitator notes */}
      <Panel title="Facilitator notes">
        {s.facilitatorNotes.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {s.facilitatorNotes.map((n, i) => (
              <li key={i} className="text-wire-ink">
                <span className="text-wire-muted">
                  [{fmtTime(n.at)}
                  {n.cardId ? ` · ${n.cardId}` : ""}]{" "}
                </span>
                {n.note}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// --- All-sessions aggregate view --------------------------------------------
// Pools every participant's responses to surface cross-session patterns: which
// features consistently read as "just me" despite social coding (novelty gap),
// which give people the most pause, and which get kept.
function AllSessionsView({ sessions }: { sessions: Session[] }) {
  const overview = sessionsOverview(sessions);
  const aggregates = aggregateByCard(sessions);
  const name = (id: string) => cardById(id)?.name ?? id;

  // Largest mean novelty gap first — the headline cross-participant signal.
  const gapRanked = aggregates
    .filter((a) => a.meanNoveltyGap !== null)
    .sort((a, b) => (b.meanNoveltyGap as number) - (a.meanNoveltyGap as number));

  // Slowest mean decision time first.
  const decideRanked = aggregates
    .filter((a) => a.meanDecisionMs !== null)
    .sort((a, b) => (b.meanDecisionMs as number) - (a.meanDecisionMs as number));

  // Keep rate, most-kept first.
  const keepRanked = aggregates
    .filter((a) => a.keepRate !== null)
    .sort((a, b) => (b.keepRate as number) - (a.keepRate as number));

  // Placement spread, sorted just-me → social by the participant mean.
  const placementRows = aggregates
    .filter((a) => a.meanPlacement !== null)
    .sort((a, b) => (a.meanPlacement as number) - (b.meanPlacement as number));

  const downloadReportPDF = () => window.print();

  if (sessions.length === 0) {
    return (
      <div className="border border-wire-border bg-white p-6">
        <Empty />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar — hidden when printing. */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h2 className="font-mono text-base text-wire-ink">
          Aggregate insights{" "}
          <span className="text-wire-muted">· {sessions.length} sessions</span>
        </h2>
        <button className="wire-btn-primary" onClick={downloadReportPDF}>
          Download report (PDF)
        </button>
      </div>

      {/* Print-only header. */}
      <div className="hidden print:block">
        <span className="wire-label">
          a1 socialness test · aggregate report
        </span>
        <h1 className="font-mono text-xl text-wire-ink">
          {sessions.length} sessions
        </h1>
      </div>

      {/* Overview tiles. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="sessions"
          value={String(overview.total)}
          sub={`${overview.completed} complete · ${overview.inProgress} in progress`}
        />
        <Stat
          label="avg completion"
          value={fmtMs(
            overview.meanCompletionMs === null
              ? null
              : Math.round(overview.meanCompletionMs),
          )}
        />
        <Stat
          label="avg cards answered"
          value={
            overview.meanCardsAnswered === null
              ? "—"
              : overview.meanCardsAnswered.toFixed(1)
          }
        />
        <Stat
          label="avg novelty gap"
          value={
            overview.overallMeanNoveltyGap === null
              ? "—"
              : String(Math.round(overview.overallMeanNoveltyGap))
          }
          highlight={
            overview.overallMeanNoveltyGap !== null &&
            overview.overallMeanNoveltyGap >= 20
          }
        />
      </div>

      {/* Novelty gap by feature. */}
      <Panel
        title="Mean novelty gap by feature (largest first)"
        className="print-avoid-break"
      >
        {gapRanked.length === 0 ? (
          <Empty />
        ) : (
          <>
            <HBarChart
              data={gapRanked.map((a, i) => ({
                label: `${name(a.cardId)} (n=${a.n})`,
                value: Math.max(0, a.meanNoveltyGap as number),
                display: String(Math.round(a.meanNoveltyGap as number)),
                highlight: i === 0,
              }))}
            />
            <p className="mt-2 font-mono text-[10px] text-wire-muted">
              Averaged across participants. A large positive gap = a feature
              repeatedly placed toward &quot;just me&quot; despite being socially
              loaded by team coding — the strongest novelty-bias signal.
            </p>
          </>
        )}
      </Panel>

      {/* Placement spread vs team coding. */}
      <Panel
        title="Where features land across all participants vs. team coding"
        className="print-avoid-break"
      >
        {placementRows.length === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="space-y-2">
              {placementRows.map((a) => (
                <AggPlacementRow key={a.cardId} agg={a} label={name(a.cardId)} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] text-wire-muted">
              <span>
                <span className="mr-1 inline-block h-2 w-2 translate-y-px bg-wire-ink" />
                mean placement
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-3 translate-y-px bg-wire-box" />
                min–max range
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 translate-y-px rotate-45 border border-wire-line" />
                team social score
              </span>
            </div>
          </>
        )}
      </Panel>

      {/* Two charts side by side: decision time + keep rate. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Mean time to decide by feature (slowest first)"
          className="print-avoid-break"
        >
          {decideRanked.length === 0 ? (
            <Empty />
          ) : (
            <HBarChart
              data={decideRanked.map((a, i) => ({
                label: name(a.cardId),
                value: a.meanDecisionMs as number,
                display: fmtMs(Math.round(a.meanDecisionMs as number)),
                highlight: i === 0,
              }))}
            />
          )}
        </Panel>

        <Panel title="Keep rate by feature" className="print-avoid-break">
          {keepRanked.length === 0 ? (
            <Empty />
          ) : (
            <HBarChart
              data={keepRanked.map((a) => ({
                label: name(a.cardId),
                value: (a.keepRate as number) * 100,
                display: `${Math.round((a.keepRate as number) * 100)}%`,
              }))}
            />
          )}
        </Panel>
      </div>

      {/* Full per-feature summary table. */}
      <Panel title="Per-feature summary" className="print-avoid-break">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-wire-border text-left text-wire-muted">
                <Th>feature</Th>
                <Th title="responses with keep or placement captured">n</Th>
                <Th>keep %</Th>
                <Th title="mean first-reaction placement (0–100)">placement</Th>
                <Th title="team-coded social weight (0–100)">social</Th>
                <Th title="mean novelty gap">gap</Th>
                <Th title="mean time to decide">decide</Th>
                <Th title="mean familiarity (1–5)">fam</Th>
                <Th title="mean debrief re-placement shift">shift</Th>
              </tr>
            </thead>
            <tbody>
              {aggregates.map((a) => (
                <tr
                  key={a.cardId}
                  className="border-b border-wire-border/50 align-top"
                >
                  <Td>
                    <span className="text-wire-ink">{a.name}</span>
                  </Td>
                  <Td>{a.n}</Td>
                  <Td>
                    {a.keepRate === null
                      ? "—"
                      : `${Math.round(a.keepRate * 100)}%`}
                  </Td>
                  <Td>
                    {a.meanPlacement === null
                      ? "—"
                      : Math.round(a.meanPlacement)}
                  </Td>
                  <Td>{a.teamSocialScore}</Td>
                  <Td>
                    <span
                      className={
                        a.meanNoveltyGap !== null && a.meanNoveltyGap >= 20
                          ? "font-bold text-red-700"
                          : "text-wire-ink"
                      }
                    >
                      {a.meanNoveltyGap === null
                        ? "—"
                        : Math.round(a.meanNoveltyGap)}
                    </span>
                  </Td>
                  <Td>{fmtMs(a.meanDecisionMs === null ? null : Math.round(a.meanDecisionMs))}</Td>
                  <Td>
                    {a.meanFamiliarity === null
                      ? "—"
                      : a.meanFamiliarity.toFixed(1)}
                  </Td>
                  <Td>
                    {a.meanRevisionShift === null
                      ? "—"
                      : `${a.meanRevisionShift >= 0 ? "+" : ""}${a.meanRevisionShift.toFixed(1)}`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// Aggregate placement row: a min–max range bar with the participant mean as a
// filled square and the team social score as a hollow diamond.
function AggPlacementRow({
  agg,
  label,
}: {
  agg: CardAggregate;
  label: string;
}) {
  const lo = agg.minPlacement ?? agg.meanPlacement ?? 0;
  const hi = agg.maxPlacement ?? agg.meanPlacement ?? 0;
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      <div className="w-36 shrink-0 truncate text-wire-ink" title={label}>
        {label}{" "}
        <span className="text-wire-muted">n={agg.n}</span>
      </div>
      <div className="relative h-5 flex-1 border border-wire-border bg-white">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-wire-box" />
        {/* min–max range */}
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 bg-wire-box"
          style={{ left: `${lo}%`, width: `${Math.max(0, hi - lo)}%` }}
          title={`range ${Math.round(lo)}–${Math.round(hi)}`}
        />
        {agg.teamSocialScore !== null ? (
          <span
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-wire-line bg-white"
            style={{ left: `${agg.teamSocialScore}%` }}
            title={`team social score ${agg.teamSocialScore}`}
          />
        ) : null}
        {agg.meanPlacement !== null ? (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-wire-ink"
            style={{ left: `${agg.meanPlacement}%` }}
            title={`mean placement ${Math.round(agg.meanPlacement)}`}
          />
        ) : null}
      </div>
      <div className="w-14 shrink-0 text-right text-wire-ink">
        {agg.meanPlacement === null ? "—" : Math.round(agg.meanPlacement)}
      </div>
    </div>
  );
}

// --- Visual insights --------------------------------------------------------
// Charts that turn the captured numbers into something legible at a glance,
// rendered with plain divs/SVG to keep the lo-fi wireframe palette (no chart
// library). These print as part of the PDF report.
function InsightCharts({ session: s }: { session: Session }) {
  const ranked = cardsByDecisionTime(s);
  const slowest = ranked[0] ?? null;
  const decisionTimes = ranked.map((r) => r.ms);
  const avgDecision =
    decisionTimes.length > 0
      ? decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length
      : null;

  const answered = s.cards.filter((c) => c.keep !== null);
  const keepCount = answered.filter((c) => c.keep === true).length;
  const killCount = answered.filter((c) => c.keep === false).length;

  // Familiarity distribution 1..5.
  const famBuckets = [1, 2, 3, 4, 5].map(
    (n) => s.cards.filter((c) => c.familiarity === n).length,
  );

  // Novelty gaps, biggest-first, for the "what the social coding missed" view.
  const gaps = s.cards
    .map((c) => ({ c, gap: noveltyGap(c) }))
    .filter((x): x is { c: (typeof s.cards)[number]; gap: number } => x.gap !== null)
    .sort((a, b) => b.gap - a.gap);
  const avgGap =
    gaps.length > 0
      ? Math.round(gaps.reduce((a, b) => a + b.gap, 0) / gaps.length)
      : null;

  const name = (id: string) => cardById(id)?.name ?? id;

  return (
    <div className="space-y-6">
      {/* Headline insight tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="slowest to decide"
          value={slowest ? name(slowest.card.cardId) : "—"}
          sub={slowest ? fmtMs(slowest.ms) : undefined}
        />
        <Stat
          label="avg decision time"
          value={fmtMs(avgDecision === null ? null : Math.round(avgDecision))}
        />
        <Stat label="keep / kill" value={`${keepCount} / ${killCount}`} />
        <Stat
          label="avg novelty gap"
          value={avgGap === null ? "—" : String(avgGap)}
          highlight={avgGap !== null && avgGap >= 20}
        />
      </div>

      {/* Decision time per card — sorted slowest-first (the headline ask). */}
      <Panel
        title="Time to decide, per feature card (slowest first)"
        className="print-avoid-break"
      >
        {ranked.length === 0 ? (
          <Empty />
        ) : (
          <>
            <HBarChart
              data={ranked.map((r, i) => ({
                label: name(r.card.cardId),
                value: r.ms,
                display: fmtMs(r.ms),
                highlight: i === 0,
              }))}
            />
            <p className="mt-2 font-mono text-[10px] text-wire-muted">
              Decision time = card shown → answer committed (keep/kill +
              placement). The longest bar is the card that gave this participant
              the most pause.
            </p>
          </>
        )}
      </Panel>

      {/* Placement vs the team's social coding — the novelty gap, visualized. */}
      <Panel
        title="Where each feature landed vs. team social coding"
        className="print-avoid-break"
      >
        {s.cards.length === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="space-y-2">
              {s.cards.map((c) => {
                const cfg = cardById(c.cardId);
                const social = cfg ? teamSocialScore(cfg.properties) : null;
                return (
                  <PlacementRow
                    key={c.cardId}
                    label={name(c.cardId)}
                    placement={c.linePlacement}
                    social={social}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] text-wire-muted">
              <span>
                <span className="mr-1 inline-block h-2 w-2 translate-y-px bg-wire-ink" />
                participant placement
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 translate-y-px rotate-45 border border-wire-line" />
                team social score
              </span>
              <span>left = just me · right = other people</span>
            </div>
          </>
        )}
      </Panel>

      {/* Two compact distributions side by side. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Panel title="Keep vs. kill" className="print-avoid-break">
          {answered.length === 0 ? (
            <Empty />
          ) : (
            <div>
              <div className="flex h-6 w-full overflow-hidden border border-wire-border font-mono text-[10px]">
                {keepCount > 0 ? (
                  <div
                    className="flex items-center justify-center bg-wire-ink text-white"
                    style={{ width: `${(keepCount / answered.length) * 100}%` }}
                  >
                    {keepCount}
                  </div>
                ) : null}
                {killCount > 0 ? (
                  <div
                    className="flex items-center justify-center bg-wire-box text-wire-ink"
                    style={{ width: `${(killCount / answered.length) * 100}%` }}
                  >
                    {killCount}
                  </div>
                ) : null}
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-wire-muted">
                <span>keep {keepCount}</span>
                <span>kill {killCount}</span>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Familiarity (1–5)" className="print-avoid-break">
          {famBuckets.every((n) => n === 0) ? (
            <Empty />
          ) : (
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {famBuckets.map((count, i) => {
                const max = Math.max(1, ...famBuckets);
                return (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="font-mono text-[10px] text-wire-ink">
                      {count || ""}
                    </span>
                    <div
                      className="w-full bg-wire-line"
                      style={{ height: `${(count / max) * 56}px` }}
                    />
                    <span className="font-mono text-[10px] text-wire-muted">
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// Headline stat tile.
function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border bg-white p-3 ${
        highlight ? "border-red-600" : "border-wire-border"
      }`}
    >
      <div className="wire-label">{label}</div>
      <div
        className={`mt-1 truncate font-mono text-sm ${
          highlight ? "font-bold text-red-700" : "text-wire-ink"
        }`}
        title={value}
      >
        {value}
      </div>
      {sub ? (
        <div className="font-mono text-[10px] text-wire-muted">{sub}</div>
      ) : null}
    </div>
  );
}

// Generic horizontal bar chart, scaled to the largest value.
function HBarChart({
  data,
}: {
  data: { label: string; value: number; display: string; highlight?: boolean }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
          <div
            className="w-32 shrink-0 truncate text-wire-ink"
            title={d.label}
          >
            {d.label}
          </div>
          <div className="relative h-4 flex-1 bg-wire-box">
            <div
              className={`absolute left-0 top-0 h-full ${
                d.highlight ? "bg-wire-ink" : "bg-wire-line"
              }`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="w-14 shrink-0 text-right text-wire-ink">
            {d.display}
          </div>
        </div>
      ))}
    </div>
  );
}

// One feature on the 0..100 socialness line: a filled square for the
// participant's placement and a hollow diamond for the team's coded social
// score, so the gap between them reads at a glance.
function PlacementRow({
  label,
  placement,
  social,
}: {
  label: string;
  placement: number | null;
  social: number | null;
}) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      <div className="w-32 shrink-0 truncate text-wire-ink" title={label}>
        {label}
      </div>
      <div className="relative h-5 flex-1 border border-wire-border bg-white">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-wire-box" />
        {social !== null ? (
          <span
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-wire-line bg-white"
            style={{ left: `${social}%` }}
            title={`team social score ${social}`}
          />
        ) : null}
        {placement !== null ? (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-wire-ink"
            style={{ left: `${placement}%` }}
            title={`placement ${placement}`}
          />
        ) : null}
      </div>
      <div className="w-14 shrink-0 text-right text-wire-ink">
        {placement ?? "—"}
      </div>
    </div>
  );
}

// --- Small presentational helpers ------------------------------------------
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-wire-muted">{label}: </span>
      <span className="text-wire-ink">{value}</span>
    </div>
  );
}
function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-wire-border bg-white p-4 ${className}`}>
      <h3 className="mb-3 wire-label">{title}</h3>
      {children}
    </div>
  );
}
function Th({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <th title={title} className="px-2 py-1 font-normal">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-1">{children}</td>;
}
function Note({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-wire-muted">{label}: </span>
      <span className="text-wire-ink">{value || "—"}</span>
    </div>
  );
}
function Empty() {
  return <span className="font-mono text-xs text-wire-muted">—</span>;
}
