"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HamburgerMenu } from "@/components/chrome/hamburger-menu";

/* -----------------------------------------------------------------------------
   App header — handoff §6 "Top bar"
   - Sticky to the top of the viewport so it remains visible while scrolling.
   - Compacts to ~75% bar height / ~80% element scale once the user has scrolled
     past a small threshold, then animates back when scrolled to top.
   - Brand wordmark hidden below 410px to free up horizontal room.
   - Action cluster (left → right): Build Lineup → Lineup Data → Menu.
   ----------------------------------------------------------------------------- */

type NavLink = {
  href: string;
  label: React.ReactNode;
  matchPrefix?: string;
};

const NAV: NavLink[] = [
  {
    href: "/community",
    label: <>Lineup Data</>,
    matchPrefix: "/community",
  },
];

function isActive(pathname: string, link: NavLink): boolean {
  if (link.matchPrefix) return pathname === link.matchPrefix || pathname.startsWith(`${link.matchPrefix}/`);
  return pathname === link.href;
}

const TRANSITION = "transition-all duration-200 ease-out";

export function Header() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div
        className={cn(
          "mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-7",
          TRANSITION,
          scrolled ? "py-2 sm:py-[13px]" : "py-3 sm:py-[18px]",
        )}
      >
        <Link
          href="/"
          aria-label="Starting XI 2026 — home"
          className={cn(
            "group flex items-center gap-2 text-ink",
            "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
            "transition-colors duration-150 ease-in-out",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "leading-none",
              TRANSITION,
              scrolled ? "text-base" : "text-xl",
            )}
          >
            🏆
          </span>
          <span
            className={cn(
              "hidden font-display leading-none tracking-[0.02em] min-[410px]:inline",
              TRANSITION,
              scrolled ? "text-[14px] sm:text-[18px]" : "text-[18px] sm:text-[22px]",
            )}
          >
            Starting XI 2026
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul className={cn("flex items-center", TRANSITION, scrolled ? "gap-1.5 sm:gap-3" : "gap-2 sm:gap-4")}>
            <li>
              <Link
                href="/countries"
                className={cn(
                  "inline-flex items-center rounded-sm text-accent-ink",
                  "font-condensed font-bold uppercase tracking-[0.1em]",
                  "bg-accent hover:bg-accent-deep",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
                  TRANSITION,
                  scrolled ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[12px]",
                )}
              >
                Build Lineup
              </Link>
            </li>
            {NAV.map((link) => {
              const active = isActive(pathname, link);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex items-center font-condensed font-bold uppercase tracking-[0.1em]",
                      "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
                      active ? "text-ink" : "text-ink-3 hover:text-ink",
                      "after:absolute after:left-0 after:right-0 after:-bottom-[6px] after:h-[2px] after:rounded-full",
                      active ? "after:bg-accent" : "after:bg-transparent",
                      TRANSITION,
                      scrolled ? "text-[11px]" : "text-[14px]",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <HamburgerMenu scrolled={scrolled} transition={TRANSITION} />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
