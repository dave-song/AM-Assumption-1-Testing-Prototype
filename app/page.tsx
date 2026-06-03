"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@/types";
import {
  createSession,
  findUnfinishedLocal,
  saveLocal,
  syncRemote,
} from "@/lib/session";
import { cards } from "@/config/cards";

// Step 0 — Setup and consent (spec 5.1). Enter participant ID, confirm consent,
// generate and store the randomized cardOrder, then enter the session.
export default function Home() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [consent, setConsent] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fixedOrder, setFixedOrder] = useState("");
  const [resumable, setResumable] = useState<Session | null>(null);

  useEffect(() => {
    setResumable(findUnfinishedLocal());
  }, []);

  const start = async () => {
    const order = fixedOrder
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const validOrder =
      order.length === cards.length &&
      cards.every((c) => order.includes(c.id))
        ? order
        : undefined;

    const session = createSession(participantId, Date.now(), {
      fixedOrder: validOrder,
    });
    session.consent = consent;
    saveLocal(session);
    void syncRemote(session);
    router.push(`/session/${session.id}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <div>
        <span className="wire-label">listening study · setup</span>
        <h1 className="mt-1 font-mono text-xl text-wire-ink">
          Session setup
        </h1>
      </div>

      {resumable ? (
        <div className="border border-wire-line bg-white p-3">
          <p className="font-mono text-xs text-wire-muted">
            An unfinished session for{" "}
            <span className="text-wire-ink">{resumable.participantId}</span> was
            found on this device.
          </p>
          <button
            className="wire-btn mt-2"
            onClick={() => router.push(`/session/${resumable.id}`)}
          >
            Resume it
          </button>
        </div>
      ) : null}

      <div className="space-y-4 border border-wire-border bg-white p-5">
        <label className="block">
          <span className="wire-label">participant ID</span>
          <input
            className="wire-input mt-1 w-full"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="e.g. P03 (blank = auto)"
          />
        </label>

        {/* Consent text — replace with the exact wording from plan 13.6. */}
        <div className="space-y-2">
          <span className="wire-label">consent</span>
          <p className="font-mono text-xs leading-relaxed text-wire-muted">
            You&apos;re taking part in a short, moderated study about music-app
            features. We&apos;ll record your choices and your reasons. There are
            no right answers. You can stop at any time. Your responses are stored
            for research and are not shared outside the study team.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span className="font-mono text-sm text-wire-ink">
              I agree to take part.
            </span>
          </label>
        </div>

        <button
          className="font-mono text-xs text-wire-muted underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "hide" : "facilitator options"}
        </button>
        {showAdvanced ? (
          <label className="block">
            <span className="wire-label">
              fixed card order (optional, 8 ids)
            </span>
            <input
              className="wire-input mt-1 w-full"
              value={fixedOrder}
              onChange={(e) => setFixedOrder(e.target.value)}
              placeholder="C3 C1 C7 C2 C8 C5 C4 C6"
            />
            <span className="font-mono text-[11px] text-wire-muted">
              Leave blank to randomize. Invalid input is ignored.
            </span>
          </label>
        ) : null}

        <button
          className="wire-btn-primary w-full"
          disabled={!consent}
          onClick={start}
        >
          Begin session
        </button>
      </div>

      <Link
        href="/admin"
        className="text-center font-mono text-xs text-wire-muted underline"
      >
        Researcher: view session log
      </Link>
    </main>
  );
}
