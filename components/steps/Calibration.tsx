"use client";

import React, { useState } from "react";
import type { StepProps } from "./types";
import { anchors } from "@/config/cards";
import { SocialnessLine } from "@/components/ui/SocialnessLine";
import { WireframeFrame } from "@/components/ui/WireframeFrame";
import { Wireframe } from "@/components/ui/wireframes";

// Step 3 — Calibration (spec 5.3 / plan 13.3 D). Present the two anchors one at
// a time; the participant places each on the line (0..100). Do not correct
// them — anchors are calibration only. Placements are stored.
export default function Calibration({ session, setSession, onNext, now }: StepProps) {
  const [idx, setIdx] = useState(0);
  const [placement, setPlacement] = useState<number | null>(null);

  const anchor = anchors[idx];
  const isLast = idx === anchors.length - 1;

  const handleConfirm = () => {
    if (placement === null) return;
    setSession((s) => ({
      ...s,
      calibration: {
        anchorPlacements: [
          ...s.calibration.anchorPlacements.filter((a) => a.id !== anchor.id),
          { id: anchor.id, placement },
        ],
      },
    }));
    if (isLast) {
      onNext();
    } else {
      setIdx((i) => i + 1);
      setPlacement(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="font-mono text-sm text-wire-muted">
        Here&apos;s an example. Place it on the line wherever it feels right to
        you. ({idx + 1} of {anchors.length})
      </p>

      <div className="mx-auto max-w-xs">
        <WireframeFrame caption={anchor.caption}>
          <Wireframe name={anchor.wireframe} />
        </WireframeFrame>
      </div>

      <div className="border border-wire-border bg-white p-6">
        <SocialnessLine value={placement} onChange={setPlacement} />
      </div>

      <div className="flex justify-end">
        <button
          className="wire-btn-primary"
          onClick={handleConfirm}
          disabled={placement === null}
        >
          {isLast ? "Next" : "Place next"}
        </button>
      </div>
    </div>
  );
}
