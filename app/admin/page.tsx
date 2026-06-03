"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@/types";
import { listLocal, STEPS } from "@/lib/session";
import type { StoreHealth } from "@/lib/store";
import {
  dismissalLatencyMs,
  noveltyGap,
  sessionsToCsv,
  stepDwellMs,
  teamSocialScore,
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
          className={`mb-6 border p-3 font-mono text-xs ${
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        {/* Session list */}
        <aside className="space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`block w-full border p-2 text-left ${
                selected === s.id
                  ? "border-wire-ink bg-wire-box"
                  : "border-wire-border bg-white"
              }`}
            >
              <div className="font-mono text-sm text-wire-ink">
                {s.participantId}
              </div>
              <div className="font-mono text-[11px] text-wire-muted">
                {fmtTime(s.startedAt)} ·{" "}
                {s.finishedAt ? "complete" : "in progress"}
              </div>
            </button>
          ))}
        </aside>

        {/* Detail */}
        <section>
          {current ? <SessionDetail session={current} /> : null}
        </section>
      </div>
    </main>
  );
}

function SessionDetail({ session: s }: { session: Session }) {
  const completeMs =
    s.finishedAt !== null ? s.finishedAt - s.startedAt : null;

  return (
    <div className="space-y-6">
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
                <Th>dismiss</Th>
                <Th title="hidden team-coded properties">team props</Th>
                <Th title="team social score − line placement">novelty gap</Th>
                <Th>why</Th>
              </tr>
            </thead>
            <tbody>
              {s.cards.map((c) => {
                const cfg = cardById(c.cardId);
                const gap = noveltyGap(c);
                return (
                  <tr
                    key={c.cardId}
                    className="border-b border-wire-border/50 align-top"
                  >
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
                    <Td>
                      <span className="text-wire-ink">{c.why || "—"}</span>
                    </Td>
                  </tr>
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

// --- Small presentational helpers ------------------------------------------
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-wire-muted">{label}: </span>
      <span className="text-wire-ink">{value}</span>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-wire-border bg-white p-4">
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
