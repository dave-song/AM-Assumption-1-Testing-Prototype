"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { StepProps } from "./types";
import { downloadJSON, saveLocal, syncRemote } from "@/lib/session";

// Step 7 — Done (spec 5.7). Mark finished, autosave + sync, offer a JSON
// export escape hatch, and return to setup for the next participant.
export default function Done({ session, setSession, now }: StepProps) {
  const router = useRouter();
  const finalized = useRef(false);

  useEffect(() => {
    if (finalized.current) return;
    finalized.current = true;
    setSession((s) => {
      const finished = s.finishedAt ? s : { ...s, finishedAt: now() };
      saveLocal(finished);
      void syncRemote(finished);
      return finished;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <h2 className="font-mono text-lg text-wire-ink">Thank you.</h2>
      <p className="font-mono text-sm text-wire-muted">
        That&apos;s everything. Your responses have been saved.
      </p>

      <div className="flex flex-col items-center gap-3">
        <button className="wire-btn" onClick={() => downloadJSON(session)}>
          Export this session (JSON)
        </button>
        <button
          className="wire-btn-primary"
          onClick={() => router.push("/")}
        >
          Start a new session
        </button>
      </div>

      <p className="font-mono text-[11px] text-wire-muted">
        Session ID: {session.id}
      </p>
    </div>
  );
}
