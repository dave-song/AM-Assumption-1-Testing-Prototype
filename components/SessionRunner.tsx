"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@/types";
import {
  enterStep,
  exitStep,
  saveLocal,
  STEPS,
  syncRemote,
} from "@/lib/session";
import { FacilitatorPanel } from "@/components/ui/FacilitatorPanel";

import Baseline from "@/components/steps/Baseline";
import LineIntro from "@/components/steps/LineIntro";
import Calibration from "@/components/steps/Calibration";
import CardLoop from "@/components/steps/CardLoop";
import Compose from "@/components/steps/Compose";
import Probe from "@/components/steps/Probe";
import Done from "@/components/steps/Done";

// ---------------------------------------------------------------------------
// Forward-only state machine hosting steps 1..7 (spec Section 4). Holds the
// session, autosaves every change to localStorage + best-effort server mirror,
// and logs per-step enter/exit timestamps. Step 0 (setup) lives on the home
// page; this runner takes over once a session exists.
// ---------------------------------------------------------------------------

const FIRST_STEP = 1; // Baseline
const DONE_STEP = 7;

const progressKey = (id: string) => `a1_progress_${id}`;

export default function SessionRunner({
  initialSession,
  initialStep,
}: {
  initialSession: Session;
  initialStep?: number;
}) {
  const now = useCallback(() => Date.now(), []);
  const [session, setSessionState] = useState<Session>(initialSession);
  const [step, setStep] = useState<number>(
    initialStep && initialStep >= FIRST_STEP ? initialStep : FIRST_STEP,
  );
  const [refireSignal, setRefireSignal] = useState(0);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);

  const setSession = useCallback(
    (updater: (s: Session) => Session) => setSessionState((s) => updater(s)),
    [],
  );

  // Log entry into the first/current step exactly once per step value.
  const enteredStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (enteredStepRef.current === step) return;
    enteredStepRef.current = step;
    setSessionState((s) => enterStep(s, step, now()));
    localStorage.setItem(progressKey(session.id), String(step));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Debounced autosave to localStorage + best-effort server mirror.
  useEffect(() => {
    const t = setTimeout(() => {
      saveLocal(session);
      void syncRemote(session);
    }, 400);
    return () => clearTimeout(t);
  }, [session]);

  // Warn on tab close / back while the session is unfinished (no data loss).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (session.finishedAt === null) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [session.finishedAt]);

  const goTo = useCallback(
    (nextStep: number) => {
      setSessionState((s) => exitStep(s, step, now()));
      setStep(nextStep);
    },
    [step, now],
  );

  const onNext = useCallback(() => goTo(step + 1), [goTo, step]);

  // --- Facilitator actions --------------------------------------------------
  const addNote = useCallback(
    (note: string) =>
      setSessionState((s) => ({
        ...s,
        facilitatorNotes: [
          ...s.facilitatorNotes,
          { cardId: currentCardId, note, at: Date.now() },
        ],
      })),
    [currentCardId],
  );

  const endSession = useCallback(() => {
    setSessionState((s) => exitStep(s, step, Date.now()));
    setStep(DONE_STEP);
  }, [step]);

  const stepProps = { session, setSession, onNext, now };

  const render = () => {
    switch (step) {
      case 1:
        return <Baseline {...stepProps} />;
      case 2:
        return <LineIntro {...stepProps} />;
      case 3:
        return <Calibration {...stepProps} />;
      case 4:
        return (
          <CardLoop
            {...stepProps}
            refireSignal={refireSignal}
            onCardChange={setCurrentCardId}
          />
        );
      case 5:
        return <Compose {...stepProps} />;
      case 6:
        return <Probe {...stepProps} />;
      default:
        return <Done {...stepProps} />;
    }
  };

  return (
    <main className="min-h-screen px-4 py-8">
      <header className="mx-auto mb-8 flex max-w-4xl items-center justify-between">
        <span className="wire-label">listening study</span>
        <span className="wire-label">
          {STEPS[step]} · {Math.min(step, DONE_STEP)}/{DONE_STEP}
        </span>
      </header>

      {render()}

      <FacilitatorPanel
        stepName={STEPS[step] ?? `step ${step}`}
        currentCardId={currentCardId}
        onRefire={() => setRefireSignal((n) => n + 1)}
        onAddNote={addNote}
        onEndSession={endSession}
      />
    </main>
  );
}
