import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span aria-hidden>🏆</span>
              <span>Starting XI 2026</span>
            </Link>
            <Link
              href="/community"
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              Community&rsquo;s Best 11 →
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</main>
        <footer className="border-t border-border py-4 text-center text-xs text-muted">
          Anonymous picks · World Cup 2026 · Not affiliated with FIFA.
        </footer>
      </body>
    </html>
  );
}
