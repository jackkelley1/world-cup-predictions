import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Nav from "./Nav";
import ScoringModal from "./ScoringModal";
import { APP_NAME, APP_TAGLINE, SHARE_URL } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.jtmk.dev"),
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Predict daily World Cup scores, lock in before kickoff, and climb the live leaderboard.",
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Predict daily World Cup scores, lock in before kickoff, and climb the live leaderboard.",
    url: "/wc",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-6">
          <header className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">
                  {APP_NAME}
                </span>
              </Link>
              <span className="hidden text-xs text-muted sm:block">
                {SHARE_URL}
              </span>
            </div>
            <p className="text-sm text-muted">{APP_TAGLINE}</p>
            <Nav />
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
        <ScoringModal />
      </body>
    </html>
  );
}
