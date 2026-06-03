"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@/types";
import { loadLocal } from "@/lib/session";
import SessionRunner from "@/components/SessionRunner";

// Host for steps 1..7. Loads the session from localStorage (source of truth on
// the device); falls back to the server API if it isn't local (e.g. resuming
// on a different machine). Resumes at the last recorded step.
export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState<number | undefined>(undefined);
  const [cardIndex, setCardIndex] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    const progress = Number(localStorage.getItem(`a1_progress_${id}`)) || undefined;
    const card = Number(localStorage.getItem(`a1_card_${id}`)) || undefined;
    setCardIndex(card);
    const local = loadLocal(id);
    if (local) {
      setSession(local);
      setStep(progress);
      setStatus("ready");
      return;
    }
    // Not on this device — try the server.
    fetch(`/api/session/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Session | null) => {
        if (!active) return;
        if (s) {
          setSession(s);
          setStep(progress);
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => active && setStatus("missing"));
    return () => {
      active = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="wire-label">loading…</span>
      </main>
    );
  }

  if (status === "missing" || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <span className="wire-label">session not found</span>
        <button className="wire-btn" onClick={() => router.push("/")}>
          Back to setup
        </button>
      </main>
    );
  }

  return (
    <SessionRunner
      initialSession={session}
      initialStep={step}
      initialCardIndex={cardIndex}
    />
  );
}
