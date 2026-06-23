"use client";

import { useEffect, useState } from "react";
import ScoringRules from "./ScoringRules";

const SEEN_KEY = "wc_scoring_seen_v1";

export default function ScoringModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How scoring works"
      onClick={close}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">How scoring works</h2>
            <p className="text-sm text-muted">
              Guess each match&apos;s final score. Points per match:
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <ScoringRules />

        <button
          onClick={close}
          className="mt-4 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#04150d] transition-colors hover:bg-accent-strong"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
