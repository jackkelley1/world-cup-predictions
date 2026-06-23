"use client";

import { useState } from "react";
import { APP_NAME, SHARE_URL } from "@/lib/config";
import { flagEmojiForTeam } from "@/lib/flags";
import type { ClientMatch } from "./types";

export function buildShareText(
  matches: ClientMatch[],
  picks: Record<string, { home: string; away: string }>,
  dayLabel: string,
): string {
  const lines: string[] = [`${APP_NAME} picks — ${dayLabel}`];
  let any = false;
  for (const m of matches) {
    const p = picks[m.id];
    if (!p || p.home === "" || p.away === "") continue;
    any = true;
    const f1 = flagEmojiForTeam(m.team1, m.flag1);
    const f2 = flagEmojiForTeam(m.team2, m.flag2);
    lines.push(`${f1} ${p.home}-${p.away} ${f2}`);
  }
  if (!any) lines.push("(no picks yet)");
  lines.push(`Play / see the board: ${SHARE_URL}`);
  return lines.join("\n");
}

export default function SharePicks({
  matches,
  picks,
  dayLabel,
}: {
  matches: ClientMatch[];
  picks: Record<string, { home: string; away: string }>;
  dayLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(matches, picks, dayLabel);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers without clipboard API.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Share your picks</h2>
        <button
          onClick={copy}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-[#04150d] transition-colors hover:bg-accent-strong"
        >
          {copied ? "Copied!" : "Copy my picks"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm leading-6 text-foreground">
        {text}
      </pre>
    </section>
  );
}
