"use client";

import React, { useEffect, useRef } from "react";
import type { StepProps } from "./types";
import { WireframeFrame } from "@/components/ui/WireframeFrame";
import { Wireframe } from "@/components/ui/wireframes";

// Step 1 — Baseline P0 (spec 5.2). Free exploration of a rough music-app
// wireframe plus one adjacent surface. Records time on screen as exploredMs.
export default function Baseline({ session, setSession, onNext, now }: StepProps) {
  const enteredAt = useRef(now());

  useEffect(() => {
    enteredAt.current = now();
  }, [now]);

  const handleNext = () => {
    const exploredMs = now() - enteredAt.current;
    setSession((s) => ({
      ...s,
      baseline: { exploredMs: s.baseline.exploredMs + exploredMs },
    }));
    onNext();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="font-mono text-sm text-wire-muted">
        Take a moment to look around this music app. Tap anything you like.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <WireframeFrame caption="Now playing">
          <Wireframe name="p0_now_playing" />
        </WireframeFrame>

        <WireframeFrame caption="Your library">
          <div className="space-y-3">
            {["playlists", "recently played", "your songs", "albums"].map(
              (label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 border border-wire-border bg-white px-2 py-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center border border-wire-border bg-wire-box font-mono text-sm text-wire-line">
                    ♪
                  </span>
                  <span className="wire-label flex-1">{label}</span>
                  <span className="font-mono text-wire-line">›</span>
                </div>
              ),
            )}
            <span className="wire-label">recently played</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square border border-wire-border bg-wire-box" />
              <div className="aspect-square border border-wire-border bg-wire-box" />
              <div className="aspect-square border border-wire-border bg-wire-box" />
            </div>
          </div>
        </WireframeFrame>
      </div>

      <div className="flex justify-end">
        <button className="wire-btn-primary" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
}
