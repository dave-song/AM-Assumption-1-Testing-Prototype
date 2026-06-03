"use client";

import React, { useRef, useState } from "react";
import type { Session } from "@/types";
import { cards, cardById, lineLabels } from "@/config/cards";
import { WireframeThumb } from "@/components/ui/wireframes";

// ---------------------------------------------------------------------------
// End-of-study summary + revision (shown on the Done screen).
//
//  • ORIGINAL range (read-only): a marker per card at its first gut-reaction
//    placement. This is preserved untouched for the research team (it's the
//    `linePlacement` captured during the loop).
//  • REVISED range (editable on Done): the same markers, now DRAGGABLE, seeded
//    at the originals. After seeing every card the participant can move any of
//    them; each move is saved as `revisedPlacement`. The shift between the two
//    is itself a signal for analysis.
//
// The card loop never shows prior placements; this debrief is the only place
// they appear. Markers are numbered to match the legend grid below.
// ---------------------------------------------------------------------------

const cardNumber = (id: string) => cards.findIndex((c) => c.id === id) + 1;

export function ResultsRange({
  session,
  editable = false,
  onRevise,
}: {
  session: Session;
  editable?: boolean;
  onRevise?: (cardId: string, placement: number) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const revisedTrackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<string | null>(null);

  const respByCard = new Map(session.cards.map((c) => [c.cardId, c]));
  const activeResp = active ? respByCard.get(active) : null;
  const activeCfg = active ? cardById(active) : null;

  // Revised value to display for a card: its revisedPlacement, or the original
  // if it hasn't been moved yet.
  const revisedValue = (cardId: string): number | null => {
    const r = respByCard.get(cardId);
    if (!r) return null;
    return r.revisedPlacement ?? r.linePlacement;
  };

  // Is there any revised data at all (for read-only contexts like admin)?
  const hasRevised = session.cards.some(
    (c) => c.revisedPlacement !== null && c.revisedPlacement !== undefined,
  );

  const pctFromClientX = (clientX: number): number => {
    const el = revisedTrackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  // --- A single range bar ----------------------------------------------------
  // NOTE: this is an inline render FUNCTION, not a nested component. Calling it
  // as {renderBar(...)} keeps the markers reconciled by position across renders;
  // rendering it as <Bar/> would remount on every state change and break drags.
  const renderBar = ({
    valueOf,
    draggable,
    trackRef,
  }: {
    valueOf: (cardId: string) => number | null;
    draggable: boolean;
    trackRef?: React.Ref<HTMLDivElement>;
  }) => (
    <div>
      <div className="flex justify-between">
        <span className="wire-label !text-[10px]">◀ {lineLabels.left}</span>
        <span className="wire-label !text-[10px]">{lineLabels.right} ▶</span>
      </div>
      <div
        ref={trackRef}
        className="relative mt-2 h-16 border border-wire-border bg-white"
      >
        <div className="absolute left-1/2 top-0 h-full w-px bg-wire-border/60" />
        {session.cards.map((c) => {
          const v = valueOf(c.cardId);
          if (v === null) return null;
          const on = active === c.cardId;
          return (
            <div
              key={c.cardId}
              onMouseEnter={() => setActive(c.cardId)}
              onClick={() => setActive(c.cardId)}
              onPointerDown={
                draggable
                  ? (e) => {
                      e.preventDefault();
                      draggingRef.current = c.cardId;
                      setActive(c.cardId);
                      try {
                        (e.target as Element).setPointerCapture?.(e.pointerId);
                      } catch {
                        /* no active pointer (or unsupported) — drag still works */
                      }
                    }
                  : undefined
              }
              onPointerMove={
                draggable
                  ? (e) => {
                      if (draggingRef.current === c.cardId) {
                        onRevise?.(c.cardId, pctFromClientX(e.clientX));
                      }
                    }
                  : undefined
              }
              onPointerUp={
                draggable
                  ? (e) => {
                      if (draggingRef.current === c.cardId) {
                        draggingRef.current = null;
                        try {
                          (e.target as Element).releasePointerCapture?.(e.pointerId);
                        } catch {
                          /* ignore */
                        }
                      }
                    }
                  : undefined
              }
              aria-label={cardById(c.cardId)?.caption}
              className={`absolute top-0 h-full -translate-x-1/2 no-select ${
                on ? "z-10" : ""
              } ${draggable ? "cursor-ew-resize" : "cursor-pointer"}`}
              style={{ left: `${v}%` }}
            >
              <span
                className={`block h-full w-px ${on ? "bg-wire-ink" : "bg-wire-line/40"}`}
              />
              <span
                className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border ${
                  on
                    ? "h-5 w-5 border-wire-ink bg-wire-ink text-white"
                    : "h-4 w-4 border-wire-line bg-white text-wire-muted"
                }`}
              >
                <span className="-rotate-45 font-mono text-[9px] leading-none">
                  {cardNumber(c.cardId)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 text-left">
      <div>
        <h3 className="font-mono text-sm text-wire-ink">
          Where each feature landed for you
        </h3>
        <p className="font-mono text-xs text-wire-muted">
          {editable
            ? "Below is where you put each one. Now that you've seen them all, drag any marker on the second line to move it."
            : "Hover or tap a marker to see which feature it was."}
        </p>
      </div>

      {/* Original (read-only) */}
      <div className="space-y-1">
        <span className="wire-label !text-[10px] text-wire-ink">
          your first answers
        </span>
        {renderBar({
          valueOf: (id) => respByCard.get(id)?.linePlacement ?? null,
          draggable: false,
        })}
      </div>

      {/* Revised — editable on Done, read-only elsewhere if data exists */}
      {(editable || hasRevised) && (
        <div className="space-y-1">
          <span className="wire-label !text-[10px] text-wire-ink">
            {editable ? "drag to move things around" : "after seeing them all"}
          </span>
          {renderBar({
            valueOf: revisedValue,
            draggable: editable,
            trackRef: revisedTrackRef,
          })}
        </div>
      )}

      {/* Detail panel — the active card's full answer */}
      <div className="min-h-[60px] border border-wire-border bg-wire-bg p-3">
        {activeResp && activeCfg ? (
          <div className="space-y-1 font-mono text-xs text-wire-ink">
            <div className="text-sm">
              {cardNumber(activeCfg.id)}. {activeCfg.caption}
            </div>
            <div className="text-wire-muted">
              first {activeResp.linePlacement ?? "—"}/100
              {activeResp.revisedPlacement !== null &&
              activeResp.revisedPlacement !== undefined &&
              activeResp.revisedPlacement !== activeResp.linePlacement
                ? ` → moved to ${activeResp.revisedPlacement}/100`
                : ""}{" "}
              ·{" "}
              {activeResp.keep === null
                ? "—"
                : activeResp.keep
                  ? "would keep on"
                  : "would switch off"}{" "}
              · expected {activeResp.familiarity ?? "—"}/5
            </div>
            {activeResp.why ? (
              <div className="text-wire-muted">&ldquo;{activeResp.why}&rdquo;</div>
            ) : null}
          </div>
        ) : (
          <span className="wire-label !text-[10px]">
            hover a marker to see its answer
          </span>
        )}
      </div>

      {/* Legend / card grid — grayed until active */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {cards.map((c) => {
          const on = active === c.id;
          const resp = respByCard.get(c.id);
          const moved =
            resp?.revisedPlacement !== null &&
            resp?.revisedPlacement !== undefined &&
            resp?.revisedPlacement !== resp?.linePlacement;
          return (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setActive(c.id)}
              onClick={() => setActive(c.id)}
              className={`border p-2 text-left transition ${
                on
                  ? "border-wire-ink bg-wire-box opacity-100"
                  : "border-wire-border bg-white opacity-40"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] text-wire-ink">
                  {cardNumber(c.id)}. {c.caption}
                </span>
                <span className="wire-label shrink-0 !text-[10px]">
                  {resp?.linePlacement ?? "—"}
                  {moved ? `→${resp?.revisedPlacement}` : ""}
                </span>
              </div>
              <div className="h-14 overflow-hidden">
                <WireframeThumb name={c.wireframe} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
