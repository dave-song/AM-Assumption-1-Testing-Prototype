"use client";

import React, { useEffect, useRef, useState } from "react";
import type { StepProps } from "./types";
import type { CardResponse } from "@/types";
import {
  cardById,
  MIDLINE_THRESHOLD,
  SHOW_PRIOR_PLACEMENTS,
} from "@/config/cards";
import { SocialnessLine } from "@/components/ui/SocialnessLine";
import { WireframeFrame } from "@/components/ui/WireframeFrame";
import { Wireframe } from "@/components/ui/wireframes";
import { AnnouncementOverlay } from "@/components/ui/AnnouncementOverlay";
import { DictationTextarea } from "@/components/ui/DictationTextarea";

// Step 4 — Card loop (spec 5.4), repeats for every card in session.cardOrder.
// Per card: feature view -> persistent announcement (must close) -> question
// set -> Next. Records per-step timestamps and dismissal latency.

interface CardLoopProps extends StepProps {
  refireSignal: number;
  onCardChange: (cardId: string | null) => void;
  // The current card position is owned by SessionRunner so that Back navigation
  // can move across card boundaries. Advancing calls onNext (the runner decides
  // whether that means "next card" or "go to Compose").
  cardIndex: number;
}

export default function CardLoop({
  session,
  setSession,
  onNext,
  now,
  refireSignal,
  onCardChange,
  cardIndex,
}: CardLoopProps) {
  const cardId = session.cardOrder[cardIndex];
  const card = cardById(cardId)!;
  const isLast = cardIndex === session.cardOrder.length - 1;

  // Per-card working state, committed to the session on advance.
  const [shownAt, setShownAt] = useState<number>(now());
  const [firedAt, setFiredAt] = useState<number | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [keep, setKeep] = useState<boolean | null>(null);
  const [placement, setPlacement] = useState<number | null>(null);
  const [familiarity, setFamiliarity] = useState<number | null>(null);
  const [why, setWhy] = useState("");
  const [disambig, setDisambig] = useState<"others" | "unfamiliar" | null>(null);

  const fireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On entering a card: either hydrate a previously answered card (when the
  // participant navigates Back to it) or set up a fresh one. A card that was
  // already completed does NOT re-fire its announcement — the participant has
  // already acknowledged it, so we restore their answers and skip the gate.
  useEffect(() => {
    onCardChange(cardId);
    if (fireTimer.current) clearTimeout(fireTimer.current);

    const saved = session.cards.find((c) => c.cardId === cardId);
    const alreadyDone = !!saved && saved.announcementDismissedAt !== null;

    if (alreadyDone && saved) {
      setShownAt(saved.shownAt || now());
      setFiredAt(saved.announcementFiredAt);
      setDismissedAt(saved.announcementDismissedAt);
      setShowOverlay(false);
      setKeep(saved.keep);
      setPlacement(saved.linePlacement);
      setFamiliarity(saved.familiarity);
      setWhy(saved.why);
      setDisambig(saved.disambiguation);
      return;
    }

    // Fresh card: reset and schedule the auto-firing announcement.
    setShownAt(now());
    setFiredAt(null);
    setDismissedAt(null);
    setShowOverlay(false);
    setKeep(null);
    setPlacement(null);
    setFamiliarity(null);
    setWhy("");
    setDisambig(null);

    fireTimer.current = setTimeout(() => {
      setFiredAt(now());
      setShowOverlay(true);
    }, card.announcement.delayMs);

    return () => {
      if (fireTimer.current) clearTimeout(fireTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIndex]);

  // Facilitator re-fire: re-show the overlay and stamp a fresh fired time.
  useEffect(() => {
    if (refireSignal === 0) return;
    setFiredAt(now());
    setDismissedAt(null);
    setShowOverlay(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refireSignal]);

  const dismissed = dismissedAt !== null;
  const showDisambig =
    placement !== null && placement > MIDLINE_THRESHOLD;

  // Features placed on previous cards, shown as faint reference markers on the
  // line (config-gated; see SHOW_PRIOR_PLACEMENTS for the anchoring tradeoff).
  const priorGhosts = SHOW_PRIOR_PLACEMENTS
    ? session.cards
        .filter((c) => c.cardId !== cardId && c.linePlacement !== null)
        .map((c) => {
          const cap = cardById(c.cardId)?.caption ?? c.cardId;
          return {
            placement: c.linePlacement as number,
            label: cap.length > 26 ? `${cap.slice(0, 25)}…` : cap,
          };
        })
    : [];

  const canAdvance =
    dismissed &&
    keep !== null &&
    placement !== null &&
    familiarity !== null &&
    why.trim().length > 0 &&
    (!showDisambig || disambig !== null);

  const handleClose = () => {
    setDismissedAt(now());
    setShowOverlay(false);
  };

  const handleNext = () => {
    const answeredAt = now();
    const response: CardResponse = {
      cardId,
      position: cardIndex,
      shownAt,
      announcementFiredAt: firedAt,
      announcementDismissedAt: dismissedAt,
      keep,
      linePlacement: placement,
      // Revision happens later (Done debrief); preserve any existing value.
      revisedPlacement:
        session.cards.find((c) => c.cardId === cardId)?.revisedPlacement ?? null,
      familiarity,
      why: why.trim(),
      disambiguation: showDisambig ? disambig : null,
      answeredAt,
    };
    setSession((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.cardId === cardId ? response : c)),
    }));

    if (isLast) onCardChange(null);
    onNext(); // SessionRunner advances to the next card or to Compose.
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="font-mono text-xs text-wire-muted">
        {cardIndex + 1} of {session.cardOrder.length}
      </p>

      {/* Feature view with the persistent announcement overlay on top. */}
      <div className="relative mx-auto max-w-xs">
        <WireframeFrame caption={card.caption}>
          <Wireframe name={card.wireframe} />
        </WireframeFrame>
        {showOverlay ? (
          <AnnouncementOverlay
            announcement={card.announcement}
            onClose={handleClose}
          />
        ) : null}
      </div>

      {!dismissed ? (
        <p className="text-center font-mono text-xs text-wire-muted">
          {firedAt === null
            ? "…"
            : "Close the notification to continue."}
        </p>
      ) : (
        <div className="space-y-6 border-t border-wire-border pt-6">
          {/* Keep or kill */}
          <div>
            <p className="mb-2 font-mono text-sm text-wire-ink">
              Would you keep this turned on, or switch it off?
            </p>
            <div className="flex gap-3">
              <button
                className={keep === true ? "wire-btn-primary" : "wire-btn"}
                onClick={() => setKeep(true)}
              >
                Keep it on
              </button>
              <button
                className={keep === false ? "wire-btn-primary" : "wire-btn"}
                onClick={() => setKeep(false)}
              >
                Switch it off
              </button>
            </div>
          </div>

          {/* Line placement */}
          <div>
            <p className="mb-2 font-mono text-sm text-wire-ink">
              Place this on the line.
            </p>
            <SocialnessLine
              value={placement}
              onChange={setPlacement}
              ghosts={priorGhosts}
            />
          </div>

          {/* Familiarity */}
          <div>
            <p className="mb-2 font-mono text-sm text-wire-ink">
              How expected is something like this in a music app?
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-wire-muted">
                not at all
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={
                    familiarity === n
                      ? "wire-btn-primary w-10"
                      : "wire-btn w-10"
                  }
                  onClick={() => setFamiliarity(n)}
                >
                  {n}
                </button>
              ))}
              <span className="font-mono text-xs text-wire-muted">
                totally
              </span>
            </div>
          </div>

          {/* Why */}
          <div>
            <p className="mb-2 font-mono text-sm text-wire-ink">
              What made you put it there?
            </p>
            <DictationTextarea value={why} onChange={setWhy} />
          </div>

          {/* Conditional disambiguation */}
          {showDisambig ? (
            <div>
              <p className="mb-2 font-mono text-sm text-wire-ink">
                Is that because other people are involved, or because it&apos;s
                unfamiliar for a music app?
              </p>
              <div className="flex gap-3">
                <button
                  className={
                    disambig === "others" ? "wire-btn-primary" : "wire-btn"
                  }
                  onClick={() => setDisambig("others")}
                >
                  Other people are involved
                </button>
                <button
                  className={
                    disambig === "unfamiliar" ? "wire-btn-primary" : "wire-btn"
                  }
                  onClick={() => setDisambig("unfamiliar")}
                >
                  It&apos;s unfamiliar
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              className="wire-btn-primary"
              onClick={handleNext}
              disabled={!canAdvance}
            >
              {isLast ? "Finish features" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
