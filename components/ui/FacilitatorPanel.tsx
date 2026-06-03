"use client";

import React, { useEffect, useState } from "react";

// Optional facilitator overlay (spec Section 3). Revealed by a key combo
// (Ctrl+Shift+F) then a passcode. Lets the moderator see the current step,
// re-fire the current announcement, add an observation note, and end the
// session. Minimal but the hooks are real.

export function FacilitatorPanel({
  stepName,
  currentCardId,
  onRefire,
  onAddNote,
  onEndSession,
}: {
  stepName: string;
  currentCardId: string | null;
  onRefire: () => void;
  onAddNote: (note: string) => void;
  onEndSession: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const verify = async () => {
    setErr("");
    try {
      const res = await fetch("/api/facilitator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setErr("Incorrect passcode.");
      }
    } catch {
      setErr("Could not verify.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 w-72 border-2 border-wire-ink bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-wire-border px-3 py-2">
        <span className="wire-label">facilitator</span>
        <button className="font-mono text-xs" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      {!authed ? (
        <div className="space-y-2 p-3">
          <input
            type="password"
            className="wire-input w-full"
            placeholder="passcode"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          {err ? (
            <p className="font-mono text-xs text-red-600">{err}</p>
          ) : null}
          <button className="wire-btn w-full" onClick={verify}>
            Unlock
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <p className="font-mono text-xs text-wire-muted">
            Step: <span className="text-wire-ink">{stepName}</span>
            {currentCardId ? ` · card ${currentCardId}` : ""}
          </p>

          <button
            className="wire-btn w-full"
            onClick={onRefire}
            disabled={!currentCardId}
          >
            Re-fire announcement
          </button>

          <div className="space-y-1">
            <textarea
              className="wire-input min-h-[48px] w-full"
              placeholder="observation note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              className="wire-btn w-full"
              disabled={!note.trim()}
              onClick={() => {
                onAddNote(note.trim());
                setNote("");
              }}
            >
              Add note
            </button>
          </div>

          <button
            className="wire-btn w-full border-red-400 text-red-700"
            onClick={onEndSession}
          >
            End session now
          </button>
        </div>
      )}
    </div>
  );
}
