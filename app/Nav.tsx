"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Predict" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/scoring", label: "Scoring" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-full border border-border bg-surface p-1">
      {tabs.map((t) => {
        const active =
          t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-[#04150d]"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
