"use client";

import React, { useCallback, useRef, useState } from "react";
import { lineLabels } from "@/config/cards";

// ---------------------------------------------------------------------------
// The re-poled line (spec Section 12). A horizontal track with neutral pole
// labels and a draggable thumb mapping to 0..100. Same component, same scale,
// reused in calibration and every card placement so placements are comparable.
// Pole copy is neutral (principle 2) and comes from config.
//
// `value === null` means "not yet placed" — the thumb is hidden until the
// participant drags or taps, which lets us record a genuine placement action.
// ---------------------------------------------------------------------------

export function SocialnessLine({
  value,
  onChange,
  ghosts = [],
  disabled = false,
}: {
  value: number | null;
  onChange: (v: number) => void;
  // optional faint reference markers (e.g. anchors), shown but not draggable
  ghosts?: { placement: number; label?: string }[];
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      onChange(Math.max(0, Math.min(100, Math.round(pct))));
    },
    [onChange],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setFromClientX(e.clientX);
    setDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Non-physical pointer (e.g. programmatic) — capture is best-effort.
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return;
    setFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // best-effort
    }
  };

  return (
    <div className="no-select w-full">
      <div className="mb-2 flex justify-between gap-4">
        <span className="wire-label max-w-[40%] text-left normal-case">
          ◀ {lineLabels.left}
        </span>
        <span className="wire-label max-w-[40%] text-right normal-case">
          {lineLabels.right} ▶
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`relative h-12 w-full cursor-pointer border border-wire-line bg-white ${
          disabled ? "opacity-60" : ""
        }`}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
      >
        {/* center hint line */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-wire-border" />

        {/* ghost reference markers — faint ticks for features already placed,
            with a small diamond cap so they read as secondary to the thumb. */}
        {ghosts.map((g, i) => (
          <div
            key={i}
            className="pointer-events-none absolute top-0 h-full w-px -translate-x-1/2 bg-wire-border"
            style={{ left: `${g.placement}%` }}
            title={g.label}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-wire-border bg-wire-bg" />
          </div>
        ))}

        {/* the thumb (only once placed) */}
        {value !== null ? (
          <div
            className="absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 border-2 border-wire-ink bg-white"
            style={{ left: `${value}%` }}
          >
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-wire-ink">
              {value}
            </span>
          </div>
        ) : (
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-xs text-wire-muted">
            drag or tap to place
          </span>
        )}
      </div>

      {/* Legend identifying each ghost marker (features placed earlier). */}
      {ghosts.some((g) => g.label) ? (
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="wire-label normal-case">placed so far:</span>
          {[...ghosts]
            .sort((a, b) => a.placement - b.placement)
            .map((g, i) => (
              <span key={i} className="font-mono text-[10px] text-wire-muted">
                <span className="text-wire-border">◆</span> {g.label}{" "}
                <span className="text-wire-ink">{g.placement}</span>
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}
