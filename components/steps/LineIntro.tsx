"use client";

import React, { useState } from "react";
import type { StepProps } from "./types";
import { SocialnessLine } from "@/components/ui/SocialnessLine";

// Step 2 — Line intro (spec 5.3 / plan 13.3 D). Read what the line means.
// We show a non-recorded demo line so the participant understands the scale
// before calibration. Pole copy comes from config (lineLabels).
export default function LineIntro({ onNext }: StepProps) {
  const [demo, setDemo] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="font-mono text-sm text-wire-ink">
        Next you&apos;ll see some things a music app could do. For each one,
        you&apos;ll place a marker on this line.
      </p>
      <p className="font-mono text-sm text-wire-muted">
        The left end is for things that feel like just your own music. The right
        end is for things that feel more like a social app. Most things land
        somewhere in between — place each wherever it feels to you. Try sliding
        the marker to get a feel for it — this one isn&apos;t recorded.
      </p>

      <div className="border border-wire-border bg-white p-6">
        <SocialnessLine value={demo} onChange={setDemo} />
      </div>

      <div className="flex justify-end">
        <button className="wire-btn-primary" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
