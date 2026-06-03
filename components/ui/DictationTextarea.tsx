"use client";

import React, { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// A freeform textarea with built-in voice dictation. Tap the mic to speak and
// the browser transcribes in real time (interim words appear live, finalized
// chunks are appended to whatever is already typed). Useful for a talk-aloud
// moderated study so participants say more than they would type.
//
// Uses the browser-native Web Speech API (webkitSpeechRecognition) — no backend
// and no API key. Requires a secure context: works on localhost and on HTTPS
// (e.g. Vercel). Supported in Chrome/Edge/Safari; if unavailable, the field
// degrades to a plain textarea and the mic is hidden.
// ---------------------------------------------------------------------------

// The Web Speech API isn't in the TS DOM lib, so we treat the instance/events
// loosely. This is the only place that touches it.
/* eslint-disable @typescript-eslint/no-explicit-any */

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

// Once the speech backend proves unreachable (e.g. Brave/Arc block Google's
// endpoint and every start() fails with 'network'), hide the mic on EVERY field
// for the rest of this page load so participants aren't stuck tapping a dead
// button. In-memory only — a reload re-enables it, so a transient network blip
// on a supported browser recovers on its own.
let backendBlocked = false;
const blockSubscribers = new Set<() => void>();
function blockDictationEverywhere() {
  if (backendBlocked) return;
  backendBlocked = true;
  blockSubscribers.forEach((fn) => fn());
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function DictationTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
}: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  // Keep latest value/onChange in refs so the recognition callbacks (bound once)
  // never read stale closures.
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  // Text that was present when dictation started + finalized chunks since.
  const baseRef = useRef("");
  const finalRef = useRef("");

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR || backendBlocked) {
      setSupported(false);
      return;
    }
    // Hide this field's mic if another field discovers the backend is blocked.
    const onBlocked = () => setSupported(false);
    blockSubscribers.add(onBlocked);

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += seg + " ";
        else interim += seg;
      }
      const base = baseRef.current;
      const sep = base && !/\s$/.test(base) ? " " : "";
      onChangeRef.current(base + sep + finalRef.current + interim);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      const code: string = e?.error || "unknown";
      // Benign — user paused or we stopped it. No message.
      if (code === "no-speech" || code === "aborted") {
        setError(null);
        return;
      }
      console.error("[dictation] SpeechRecognition error:", code, e);
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone blocked — allow mic access for this site, then tap the mic again.");
      } else if (code === "audio-capture") {
        setError("No microphone found — check it's connected and selected, then try again.");
      } else if (code === "network") {
        setError(
          "Voice service unreachable. Dictation needs an internet connection, and some browsers (Brave, Arc, in-app browsers) block it — try Chrome or Safari.",
        );
        blockDictationEverywhere(); // hide the mic on all fields for this load
      } else {
        setError(`Voice input error (${code}) — you can keep typing.`);
      }
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    return () => {
      blockSubscribers.delete(onBlocked);
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    setError(null);
    baseRef.current = valueRef.current; // append to whatever is already there
    finalRef.current = "";
    try {
      rec.start();
      setListening(true);
    } catch {
      /* start() throws if already running — ignore */
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <textarea
          className="wire-input min-h-[64px] w-full pr-12"
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {supported ? (
          <button
            type="button"
            onClick={toggle}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            aria-pressed={listening}
            title={listening ? "Stop voice input" : "Speak your answer"}
            className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border transition ${
              listening
                ? "animate-pulse border-wire-ink bg-wire-ink text-white"
                : "border-wire-line bg-white text-wire-ink hover:bg-wire-box"
            }`}
          >
            <MicIcon />
          </button>
        ) : null}
      </div>
      {listening ? (
        <span className="wire-label mt-1 block !text-[10px]">
          listening… tap the mic to stop
        </span>
      ) : null}
      {error ? (
        <span className="wire-label mt-1 block !text-[10px] text-wire-ink">
          {error}
        </span>
      ) : null}
      {!supported && !error ? (
        <span className="wire-label mt-1 block !text-[10px]">
          voice input isn&apos;t available in this browser — please type
        </span>
      ) : null}
    </div>
  );
}
