"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function Countdown({
  target,
  onElapsed,
}: {
  target: number;
  onElapsed?: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (now !== null && now >= target) onElapsed?.();
  }, [now, target, onElapsed]);

  if (now === null) {
    return <span className="font-mono tabular-nums">--:--:--</span>;
  }

  const diff = Math.max(0, target - now);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <span className="font-mono tabular-nums">
      {days > 0 && `${days}d `}
      {pad(hours)}:{pad(mins)}:{pad(secs)}
    </span>
  );
}
