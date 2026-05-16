"use client";

import { useEffect, useRef, useState } from "react";

export type MarkerKind = "country" | "global" | "user";

export interface InteractiveMarker {
  kind: MarkerKind;
  emoji: string;
  pct: number;
  prefixLabel: string;
  valueLabel: string;
  ariaLabel: string;
}

// Marker zone for the squad-stat bars. Each emoji is a tap/hover target that
// reveals its numeric value in a tooltip — the values used to render
// vertically stacked below the bar, but that made card height vary with
// marker clustering. Tooltip pattern keeps the card height constant.
export function SquadStatMarkerLayer({
  markers,
}: {
  markers: InteractiveMarker[];
}) {
  const [pinnedKind, setPinnedKind] = useState<MarkerKind | null>(null);
  const [hoveredKind, setHoveredKind] = useState<MarkerKind | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pinnedKind === null) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPinnedKind(null);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [pinnedKind]);

  const shownKind = pinnedKind ?? hoveredKind;

  return (
    <div ref={containerRef} className="relative h-9">
      {markers.map((m) => {
        const isShown = shownKind === m.kind;
        const isUser = m.kind === "user";
        return (
          <div
            key={m.kind}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${m.pct}%`, transform: "translateX(-50%)" }}
          >
            {isShown && (
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full mb-1 flex flex-col items-center whitespace-nowrap rounded bg-ink px-2 py-1 text-white shadow-sm"
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-white/70 leading-tight">
                  {m.prefixLabel}
                </span>
                <span className="text-[12px] font-semibold leading-tight">
                  {m.valueLabel}
                </span>
              </div>
            )}
            <button
              type="button"
              aria-label={m.ariaLabel}
              aria-pressed={pinnedKind === m.kind}
              className="flex cursor-pointer flex-col items-center border-0 bg-transparent p-0"
              onClick={(e) => {
                e.stopPropagation();
                setPinnedKind((prev) => (prev === m.kind ? null : m.kind));
              }}
              onMouseEnter={() => setHoveredKind(m.kind)}
              onMouseLeave={() =>
                setHoveredKind((prev) => (prev === m.kind ? null : prev))
              }
            >
              <span className="text-[22px] leading-none" aria-hidden="true">
                {m.emoji}
              </span>
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                className="mt-1"
                aria-hidden="true"
              >
                <polygon
                  points="0,0 12,0 6,10"
                  fill={isUser ? "#dc2626" : "#9ca3af"}
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
