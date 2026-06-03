"use client";

import React, { useEffect, useRef, useState } from "react";
import type { StepProps } from "./types";
import type { CardResponse } from "@/types";
import { cardById, MIDLINE_THRESHOLD } from "@/config/cards";
import { SocialnessLine } from "@/components/ui/SocialnessLine";
import { WireframeFrame } from "@/components/ui/WireframeFrame";
import { Wireframe } from "@/components/ui/wireframes";
import { AnnouncementOverlay } from "@/components/ui/AnnouncementOverlay";

// Step 4 — Card loop (spec 5.4), repeats for all 8 cards in session.cardOrder.
// Per card: feature view -> persistent announcement (must close) -> question
// set -> Next. Records per-step timestamps and dismissal latency.

interface CardLoopProps extends StepProps {
  refireSignal: number;
  onCardChange: (cardId: string | null) => void;
}

export default function CardLoop({
  session,
  setSession,
  onNext,
  now,
  refireSignal,
  onCardChange,
}: CardLoopProps) {
  const [idx, setIdx] = useState(0);
  const cardId = session.cardOrder[idx];
  const card = cardById(cardId)!;
  const isLast = idx === session.cardOrder.length - 1;

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

  // On entering a card: reset state, schedule the announcement.
  useEffect(() => {
    const t = now();
    setShownAt(t);
    setFiredAt(null);
    setDismissedAt(null);
    setShowOverlay(false);
    setKeep(null);
    setPlacement(null);
    setFamiliarity(null);
    setWhy("");
    setDisambig(null);
    onCardChange(cardId);

    if (fireTimer.current) clearTimeout(fireTimer.current);
    fireTimer.current = setTimeout(() => {
      setFiredAt(now());
      setShowOverlay(true);
    }, card.announcement.delayMs);

    return () => {
      if (fireTimer.current) clearTimeout(fireTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

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
      position: idx,
      shownAt,
      announcementFiredAt: firedAt,
      announcementDismissedAt: dismissedAt,
      keep,
      linePlacement: placement,
      familiarity,
      why: why.trim(),
      disambiguation: showDisambig ? disambig : null,
      answeredAt,
    };
    setSession((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.cardId === cardId ? response : c)),
    }));

    if (isLast) {
      onCardChange(null);
      onNext();
    } else {
      setIdx((i) => i + 1);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="font-mono text-xs text-wire-muted">
        {idx + 1} of {session.cardOrder.length}
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
            <SocialnessLine value={placement} onChange={setPlacement} />
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
            <textarea
              className="wire-input min-h-[64px] w-full"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
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
