"use client";

import React, { useState } from "react";
import type { StepProps } from "./types";
import { cardById, cards } from "@/config/cards";
import { WireframeThumb } from "@/components/ui/wireframes";

// Step 6 — Probe and reasoning (spec 5.6 / plan 13.3 G). Title-neutral.
// Top pick (single), crossed-line set (multi), disliked set (multi), and four
// open prompts.

type Mode = "top" | "crossed" | "disliked";

function CardGrid({
  selected,
  onToggle,
  multi,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  multi: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {cards.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            className={`border p-2 text-left ${
              on ? "border-wire-ink bg-wire-box" : "border-wire-border bg-white"
            }`}
          >
            <div className="mb-1 font-mono text-[11px] text-wire-ink">
              {on ? (multi ? "☑ " : "● ") : "☐ "}
              {c.caption}
            </div>
            <div className="h-16 overflow-hidden">
              <WireframeThumb name={c.wireframe} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function Probe({ session, setSession, onNext }: StepProps) {
  const [topPick, setTopPick] = useState<string | null>(session.probe.topPick);
  const [crossed, setCrossed] = useState<string[]>(session.probe.crossedLine);
  const [disliked, setDisliked] = useState<string[]>(session.probe.disliked);
  const [notes, setNotes] = useState(session.probe.notes);
  const [mode, setMode] = useState<Mode>("top");

  const toggleMulti =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
      setter((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );

  const commit = () => {
    setSession((s) => ({
      ...s,
      probe: { topPick, crossedLine: crossed, disliked, notes },
    }));
    onNext();
  };

  const setNote = (key: keyof typeof notes, v: string) =>
    setNotes((n) => ({ ...n, [key]: v }));

  const topName = topPick ? cardById(topPick)?.name : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h2 className="font-mono text-base text-wire-ink">A few last questions.</h2>

      {/* Selection mode tabs keep one grid reusable and clear. */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(
            [
              ["top", "The one you liked most"],
              ["crossed", "Any that crossed a line"],
              ["disliked", "Any you'd skip"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              className={mode === m ? "wire-btn-primary" : "wire-btn"}
              onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "top" && (
          <CardGrid
            selected={topPick ? [topPick] : []}
            onToggle={(id) => setTopPick((p) => (p === id ? null : id))}
            multi={false}
          />
        )}
        {mode === "crossed" && (
          <CardGrid
            selected={crossed}
            onToggle={toggleMulti(setCrossed)}
            multi
          />
        )}
        {mode === "disliked" && (
          <CardGrid
            selected={disliked}
            onToggle={toggleMulti(setDisliked)}
            multi
          />
        )}

        <p className="font-mono text-xs text-wire-muted">
          Top pick: {topName ?? "—"} · Crossed a line: {crossed.length} ·
          Would skip: {disliked.length}
        </p>
      </div>

      {/* Four open prompts */}
      <div className="space-y-4">
        {(
          [
            ["topWhy", "What made the top one feel right here?"],
            ["crossedWhy", "What crossed a line on the one you turned off first?"],
            [
              "watchedFeeling",
              "Did anything make you feel watched or expected to respond?",
            ],
            [
              "offOrIgnore",
              "For the ones you would skip, would you turn them off or just ignore them?",
            ],
          ] as [keyof typeof notes, string][]
        ).map(([key, label]) => (
          <div key={key}>
            <p className="mb-1 font-mono text-sm text-wire-ink">{label}</p>
            <textarea
              className="wire-input min-h-[56px] w-full"
              value={notes[key]}
              onChange={(e) => setNote(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="wire-btn-primary"
          onClick={commit}
          disabled={topPick === null}
        >
          Finish
        </button>
      </div>
    </div>
  );
}
