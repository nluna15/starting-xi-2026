import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { ShareButton } from "@/components/share-button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Cup Roster — Build your XI",
  description:
    "Pick a country and build their starting 11 + bench for the 2026 FIFA World Cup. Compare your picks against the wisdom of the crowd.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span aria-hidden>🏆</span>
              <span>World Cup Roster</span>
            </Link>
            <ShareButton />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</main>
        <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
          Anonymous picks · World Cup 2026 · Not affiliated with FIFA.
        </footer>
      </body>
    </html>
  );
}
