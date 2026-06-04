"use client";

import React from "react";
import type { Announcement } from "@/types";

// ---------------------------------------------------------------------------
// Persistent, must-close notification (spec Section 12, principle 3).
// Dims the background but keeps the now-playing context visible behind it.
// No timeout — the participant must click "Close". The parent records the
// fired/dismissed timestamps; this component just renders and reports dismiss.
// ---------------------------------------------------------------------------

export function AnnouncementOverlay({
  announcement,
  onClose,
}: {
  announcement: Announcement;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/30 p-4">
      <div className="mt-6 w-full max-w-xs border-2 border-wire-ink bg-white shadow-lg">
        <div className="border-b border-wire-border px-3 py-2">
          <span className="wire-label">scenario</span>
        </div>
        <div className="px-3 py-4">
          <p className="font-mono text-sm font-bold text-wire-ink">
            {announcement.title}
          </p>
          <p className="mt-1 font-mono text-sm text-wire-ink">
            {announcement.body}
          </p>
        </div>
        <div className="flex justify-end border-t border-wire-border px-3 py-2">
          <button className="wire-btn-primary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
