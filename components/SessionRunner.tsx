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
  initialCardIndex,
}: {
  initialSession: Session;
  initialStep?: number;
  initialCardIndex?: number;
}) {
  const now = useCallback(() => Date.now(), []);
  const [session, setSessionState] = useState<Session>(initialSession);
  const [step, setStep] = useState<number>(
    initialStep && initialStep >= FIRST_STEP ? initialStep : FIRST_STEP,
  );
  // Card position is owned here so Back can cross card boundaries. The resume
  // value is read in the session page (client-only) and passed in, so a reload
  // returns to the right card rather than restarting the loop.
  const [cardIndex, setCardIndex] = useState<number>(initialCardIndex ?? 0);
  const [refireSignal, setRefireSignal] = useState(0);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);

  const lastCardIndex = session.cardOrder.length - 1;

  useEffect(() => {
    localStorage.setItem(`a1_card_${session.id}`, String(cardIndex));
  }, [cardIndex, session.id]);

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

  // Forward: within the card loop, advance card-by-card, then on to Compose.
  const onNext = useCallback(() => {
    if (step === 4 && cardIndex < lastCardIndex) {
      setCardIndex((i) => i + 1);
    } else {
      goTo(step + 1);
    }
  }, [goTo, step, cardIndex, lastCardIndex]);

  // Back: one page at a time. Across the card loop this means card-by-card;
  // entering the loop from Compose lands on the last card. Answers are preserved
  // (CardLoop hydrates them) and already-seen announcements do not re-fire.
  const canGoBack = step >= FIRST_STEP + 1 && step < DONE_STEP;
  const onBack = useCallback(() => {
    if (step === 4 && cardIndex > 0) {
      setCardIndex((i) => i - 1);
    } else if (step === 5) {
      setCardIndex(lastCardIndex);
      goTo(4);
    } else if (step > FIRST_STEP) {
      goTo(step - 1);
    }
  }, [goTo, step, cardIndex, lastCardIndex]);

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
            cardIndex={cardIndex}
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
      <header className="mx-auto mb-4 flex max-w-4xl items-center justify-between">
        <span className="wire-label">listening study</span>
        <span className="wire-label">
          {STEPS[step]} · {Math.min(step, DONE_STEP)}/{DONE_STEP}
        </span>
      </header>

      {/* Back navigation. Moves one page at a time (card-by-card in the loop);
          previous answers are preserved when returning. */}
      <div className="mx-auto mb-6 max-w-4xl">
        {canGoBack ? (
          <button className="wire-btn" onClick={onBack}>
            ← Back
          </button>
        ) : (
          <span className="inline-block h-[38px]" aria-hidden />
        )}
      </div>

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
