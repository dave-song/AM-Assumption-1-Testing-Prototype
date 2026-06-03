"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { StepProps } from "./types";
import { cardById, cards } from "@/config/cards";
import { WireframeThumb } from "@/components/ui/wireframes";

// Step 5 — Compose your own (spec 5.5). Two-zone drag and drop: a fixed
// baseline app, a tray of all the cards, and a "Your app" drop zone. Records
// included (ordered), excluded, and a stoppedAt timestamp.

function Chip({ cardId }: { cardId: string }) {
  const card = cardById(cardId)!;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cardId,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-40 cursor-grab border border-wire-line bg-white p-2 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="mb-1 font-mono text-xs text-wire-ink">{card.caption}</div>
      <div className="h-20 overflow-hidden">
        <WireframeThumb name={card.wireframe} />
      </div>
    </div>
  );
}

function Zone({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] border-2 border-dashed p-3 ${
        isOver ? "border-wire-ink bg-wire-box" : "border-wire-border bg-white"
      } ${className}`}
    >
      <p className="mb-3 wire-label">{title}</p>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

export default function Compose({ session, setSession, onNext, now }: StepProps) {
  const allIds = cards.map((c) => c.id);
  const [included, setIncluded] = useState<string[]>(session.compose.included);
  const [stopped, setStopped] = useState<boolean>(
    session.compose.stoppedAt !== null,
  );

  const trayIds = allIds.filter((id) => !included.includes(id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const cardId = String(e.active.id);
    const over = e.over?.id;
    if (over === "yourapp" && !included.includes(cardId)) {
      setIncluded((prev) => [...prev, cardId]);
    } else if (over === "tray" && included.includes(cardId)) {
      setIncluded((prev) => prev.filter((id) => id !== cardId));
    }
  };

  // Persist composition to the session whenever it changes.
  const persist = (next: string[], stoppedAt: number | null) => {
    setSession((s) => ({
      ...s,
      compose: {
        included: next,
        excluded: allIds.filter((id) => !next.includes(id)),
        stoppedAt,
      },
    }));
  };

  React.useEffect(() => {
    persist(included, session.compose.stoppedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [included]);

  const handleStop = () => {
    setStopped(true);
    persist(included, now());
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="font-mono text-sm text-wire-ink">
          Build the app you&apos;d actually want. Drag in anything you&apos;d
          keep. Leave out anything you wouldn&apos;t.
        </p>
        <p className="font-mono text-xs text-wire-muted">
          The basic music player is always here — it&apos;s your starting point.
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Your app (baseline fixed + dropped cards) */}
          <Zone id="yourapp" title="Your app">
            <div className="w-40 border border-wire-line bg-wire-box p-2">
              <div className="mb-1 font-mono text-xs text-wire-ink">
                Music player
              </div>
              <div className="font-mono text-[10px] text-wire-muted">
                always included
              </div>
            </div>
            {included.map((id) => (
              <Chip key={id} cardId={id} />
            ))}
          </Zone>

          {/* Tray of remaining cards */}
          <Zone id="tray" title="Available">
            {trayIds.map((id) => (
              <Chip key={id} cardId={id} />
            ))}
          </Zone>
        </div>
      </DndContext>

      <div className="flex items-center justify-between">
        <button
          className={stopped ? "wire-btn-primary" : "wire-btn"}
          onClick={handleStop}
        >
          {stopped ? "✓ Stopping point set" : "This is where I would stop"}
        </button>
        <button
          className="wire-btn-primary"
          onClick={onNext}
          disabled={!stopped}
        >
          Next
        </button>
      </div>
    </div>
  );
}
