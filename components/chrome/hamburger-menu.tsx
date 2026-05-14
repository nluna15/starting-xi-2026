"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { HowItWorksModal } from "@/components/chrome/how-it-works-modal";

type Props = {
  scrolled: boolean;
  transition: string;
};

type MenuItem =
  | { kind: "link"; label: string; href: string }
  | { kind: "action"; label: string; onSelect: () => void };

export function HamburgerMenu({ scrolled, transition }: Props) {
  const [open, setOpen] = React.useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: MenuItem[] = [
    { kind: "link", label: "My Lineups", href: "/my-lineups" },
    { kind: "link", label: "About", href: "/about" },
    {
      kind: "action",
      label: "How it Works",
      onSelect: () => {
        setOpen(false);
        setHowItWorksOpen(true);
      },
    },
    { kind: "link", label: "Feedback", href: "/feedback" },
  ];

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "inline-flex items-center justify-center rounded-sm",
            "border border-line-strong bg-transparent text-ink",
            "hover:border-ink-3 hover:bg-surface-2",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
            transition,
            scrolled ? "h-[26px] w-[26px]" : "h-8 w-8",
          )}
        >
          <Menu
            aria-hidden
            className={cn(
              "shrink-0",
              transition,
              scrolled ? "h-[12px] w-[12px]" : "h-[15px] w-[15px]",
            )}
          />
        </button>
        {open && (
          <div
            role="menu"
            aria-label="Site menu"
            className={cn(
              "absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-md border border-line-strong",
              "bg-surface shadow-3",
              "[animation:overlay-in_var(--t-fast)_var(--ease-out)_both]",
            )}
          >
            <ul className="flex flex-col py-2">
              {items.map((item) => (
                <li key={item.label}>
                  {item.kind === "link" ? (
                    <Link
                      role="menuitem"
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block w-full px-5 py-3 text-left font-condensed font-bold uppercase tracking-[0.1em]",
                        "text-[24px] text-ink hover:bg-surface-2",
                        "focus-visible:outline-none focus-visible:bg-surface-2",
                      )}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      role="menuitem"
                      type="button"
                      onClick={item.onSelect}
                      className={cn(
                        "block w-full px-5 py-3 text-left font-condensed font-bold uppercase tracking-[0.1em]",
                        "text-[24px] text-ink hover:bg-surface-2",
                        "focus-visible:outline-none focus-visible:bg-surface-2",
                      )}
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <HowItWorksModal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </>
  );
}
