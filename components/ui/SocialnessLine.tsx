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

        {/* ghost reference markers */}
        {ghosts.map((g, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-wire-border/70"
            style={{ left: `${g.placement}%` }}
            title={g.label}
          >
            {g.label ? (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-wire-muted">
                {g.label}
              </span>
            ) : null}
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
    </div>
  );
}
