import React from "react";

// ---------------------------------------------------------------------------
// The persistent rough music-app shell with a fake now-playing bar, so feature
// wireframes and announcements always appear in a music-listening context, not
// on a blank page (spec Section 12, principle 1). Crude on purpose.
// ---------------------------------------------------------------------------

export function WireframeFrame({
  children,
  caption,
}: {
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-sm border border-wire-border bg-white">
      {/* top app bar */}
      <div className="flex items-center justify-between border-b border-wire-border px-3 py-2">
        <span className="wire-label">music</span>
        <span className="wire-label">≡</span>
      </div>

      {/* feature surface */}
      <div className="min-h-[320px] p-3">
        {caption ? (
          <p className="mb-3 font-mono text-sm text-wire-ink">{caption}</p>
        ) : null}
        {children}
      </div>

      {/* persistent fake now-playing bar */}
      <div className="flex items-center gap-2 border-t border-wire-border bg-wire-box px-3 py-2">
        <div className="h-8 w-8 border border-wire-border bg-white" />
        <div className="flex-1">
          <div className="h-2 w-24 bg-wire-border" />
          <div className="mt-1 h-2 w-16 bg-wire-border/60" />
        </div>
        <span className="wire-label">⏮ ⏯ ⏭</span>
      </div>
    </div>
  );
}
