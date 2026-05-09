"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   App header — handoff §6 "Top bar"
   - Brand wordmark in `font-display` (Bebas Neue) — single editorial mark.
   - Nav links in `.cond` 12px ink-3, hover → ink. Active route gets a 2px
     accent underline (driven by `usePathname`, so this must be a client
     component).
   - Padding: 18px 28px on the bar; the inner row stays inside the `max-w-5xl`
     container to match the existing layout rhythm.
   ----------------------------------------------------------------------------- */

type NavLink = {
  href: string;
  label: React.ReactNode;
  /** When set, treat any pathname starting with this prefix as active. */
  matchPrefix?: string;
};

const NAV: NavLink[] = [
  {
    href: "/community",
    label: <>View Fan Lineups</>,
    matchPrefix: "/community",
  },
];

function isActive(pathname: string, link: NavLink): boolean {
  if (link.matchPrefix) return pathname === link.matchPrefix || pathname.startsWith(`${link.matchPrefix}/`);
  return pathname === link.href;
}

export function Header() {
  const pathname = usePathname() ?? "/";
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function handleShare() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-4 py-[18px] sm:px-7">
        <Link
          href="/"
          aria-label="Starting XI 2026 — home"
          className={cn(
            "group flex items-center gap-2 text-ink",
            "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
            "transition-colors duration-150 ease-in-out",
          )}
        >
          <span aria-hidden className="text-xl leading-none">
            🏆
          </span>
          <span className="font-display text-[22px] leading-none tracking-[0.02em]">
            Starting XI 2026
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul className="flex items-center gap-5">
            <li>
              <button
                type="button"
                onClick={handleShare}
                aria-label={copied ? "Link copied" : "Copy link to this page"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-accent-ink",
                  "font-condensed text-[12px] font-bold uppercase tracking-[0.1em]",
                  "transition-colors duration-300 ease-in-out",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
                  copied ? "bg-success" : "bg-accent hover:bg-accent-deep",
                )}
              >
                <Share2 aria-hidden className="h-[12px] w-[12px]" />
                <span>{copied ? "Copied" : "Share"}</span>
              </button>
            </li>
            {NAV.map((link) => {
              const active = isActive(pathname, link);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex items-center font-condensed text-[12px] font-bold uppercase tracking-[0.1em]",
                      "transition-colors duration-150 ease-in-out",
                      "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
                      active ? "text-ink" : "text-ink-3 hover:text-ink",
                      // Accent underline for the active link; reserves space so
                      // hover doesn't shift the row.
                      "after:absolute after:left-0 after:right-0 after:-bottom-[6px] after:h-[2px] after:rounded-full",
                      active ? "after:bg-accent" : "after:bg-transparent",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
