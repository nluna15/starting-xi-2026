"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CountryTile } from "@/components/country-tile";
import { cn, normalize } from "@/lib/utils";
import type { WcSlot } from "@/lib/wc-2026-teams";

type LinkMode = "build" | "community";

type Props = {
  slots: WcSlot[];
  readyCodes: string[];
  /** Where confirmed-country tiles route to. Defaults to the lineup builder. */
  linkMode?: LinkMode;
  /** FIFA code of the currently-viewed country, highlighted in the carousel. */
  activeCode?: string;
  /** If set, "All Nations" tile navigates here instead of clearing the search filter. */
  allNationsHref?: string;
};

export function CommunityCountryCarousel({
  slots,
  readyCodes,
  linkMode = "build",
  activeCode,
  allNationsHref,
}: Props) {
  const resolvedAllNationsHref =
    allNationsHref ?? (linkMode === "community" ? "/community" : undefined);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [query, setQuery] = useState("");
  const ready = useMemo(() => new Set(readyCodes), [readyCodes]);

  const filteredSlots = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return slots;
    return slots.filter((slot) => {
      const label = slot.kind === "confirmed" ? slot.name : slot.label;
      return normalize(label).includes(q);
    });
  }, [slots, query]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 1);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [filteredSlots]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-4 pb-1 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <AllNationsTile
            active={!resolvedAllNationsHref && query.trim().length === 0}
            onClick={() => setQuery("")}
            href={resolvedAllNationsHref}
          />

          {filteredSlots.map((slot) => {
            if (slot.kind === "confirmed") {
              const isActive = activeCode === slot.code;
              const hrefOverride =
                linkMode === "community" ? `/community/${slot.code}` : undefined;
              const ariaLabel =
                linkMode === "community"
                  ? `See the ${slot.name} community XI`
                  : undefined;
              return (
                <div key={slot.code} className="snap-start shrink-0 w-44">
                  <CountryTile
                    code={slot.code}
                    name={slot.name}
                    flagEmoji={slot.flagEmoji}
                    enabled={ready.has(slot.code)}
                    layout="card"
                    size="md"
                    borderless
                    className={cn(
                      "h-16",
                      isActive &&
                        "bg-accent-soft text-accent-deep ring-2 ring-accent",
                    )}
                    hrefOverride={hrefOverride}
                    ariaLabel={ariaLabel}
                  />
                </div>
              );
            }
            return (
              <div
                key={slot.key}
                className="snap-start shrink-0 flex h-16 w-44 flex-col items-center justify-center gap-0.5 rounded-md bg-bg-sunk px-3 text-center text-ink-faint"
              >
                <span className="text-xl leading-none" aria-hidden>
                  ❔
                </span>
                <span className="cond text-[11px] leading-tight">{slot.label}</span>
              </div>
            );
          })}

          {filteredSlots.length === 0 && (
            <div className="flex h-16 shrink-0 items-center px-2 text-[13px] text-ink-3">
              No countries match &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        <CarouselButton
          side="left"
          visible={canLeft}
          onClick={() => scrollBy(-1)}
          label="Scroll countries left"
        >
          <ChevronLeft className="h-4 w-4" />
        </CarouselButton>
        <CarouselButton
          side="right"
          visible={canRight}
          onClick={() => scrollBy(1)}
          label="Scroll countries right"
        >
          <ChevronRight className="h-4 w-4" />
        </CarouselButton>
      </div>

      <div className="relative mx-4 sm:mx-0">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries…"
          aria-label="Search countries"
          className={cn(
            "w-full rounded-md border border-line bg-bg px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-faint",
            "transition-[border-color,box-shadow] duration-150 ease-in-out",
            "hover:border-line-strong",
            "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
          )}
        />
      </div>
    </div>
  );
}

function AllNationsTile({
  active,
  onClick,
  href,
}: {
  active: boolean;
  onClick: () => void;
  href?: string;
}) {
  const cls = cn(
    "snap-start shrink-0 w-44 flex h-16 items-center justify-center gap-2 rounded-md px-3 text-center",
    "border border-line bg-surface-2",
    "cond text-[13px] font-bold text-ink",
    "transition-[background-color,border-color,color] duration-150 ease-in-out",
    "hover:border-accent hover:bg-accent-soft hover:text-accent-deep",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft focus-visible:border-accent",
    active && "border-accent bg-accent-soft text-accent-deep",
  );
  const inner = (
    <>
      <span className="text-base leading-none" aria-hidden>
        🌍
      </span>
      <span>All Nations</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {inner}
    </button>
  );
}

function CarouselButton({
  side,
  visible,
  onClick,
  label,
  children,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
        "border border-line-strong bg-bg-elev text-ink shadow-1 transition-[opacity,background-color,border-color] duration-150 ease-in-out",
        "hover:border-ink-3 hover:bg-surface-2",
        "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent-soft",
        "sm:flex",
        side === "left" ? "left-1 sm:-left-3" : "right-1 sm:-right-3",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {children}
    </button>
  );
}
