"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { BarRow } from "@/components/horizontal-bar-chart";
import { getFlagPrimaryColor, getFlagSecondaryColor } from "@/lib/flag-colors";

/* -----------------------------------------------------------------------------
   InsightDistributionChart — symmetric beeswarm where each country is a
   colored dot positioned along a vertical value axis (top = max → bottom =
   min). Dots try the centerline first and step alternately left/right when
   they would overlap a neighbour, producing the classic hugged-around-the-
   axis cluster. Clicking a dot toggles a tooltip with the exact value.
   ----------------------------------------------------------------------------- */

type Props = {
  rows: BarRow[];
  formatValue: (value: number) => string;
  /** Optional unit suffix appended after the median value in the callout
   *  (e.g. "caps", "years"). Omit for values that already carry a unit. */
  unitLabel?: string;
  emptyMessage?: string;
  className?: string;
};

const HIT_SIZE = 22; // px, clickable/hoverable hit-area around each dot
const DOT_SIZE = 16; // px, visible colored dot
const DOT_BORDER = 2; // px, secondary-color ring around each dot
// Center-to-center spacing used by the beeswarm packing. Halved from the
// previous DOT_SIZE + 6 to pack dots roughly 50% tighter.
const PACK_SPACING = DOT_SIZE + 3;
const PAD_Y = 14; // px, vertical padding inside the plot area
const AXIS_LABEL_HEIGHT = 22; // px reserved at top/bottom for max/min labels
const AXIS_LENGTH = 400; // px, vertical value axis length

type Placed = { row: BarRow; yPx: number; slot: number };

// Generates slot offsets in beeswarm order: 0, +1, -1, +2, -2, ...
function* beeswarmSlots(): Generator<number> {
  yield 0;
  for (let n = 1; ; n++) {
    yield n;
    yield -n;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function placeFlags(rows: BarRow[], height: number, min: number, span: number): Placed[] {
  const sorted = [...rows].sort((a, b) => a.value - b.value);
  const usable = Math.max(0, height - 2 * PAD_Y);
  const placed: Placed[] = [];
  for (const row of sorted) {
    const ratio = span === 0 ? 0.5 : (row.value - min) / span;
    // Larger value → smaller yPx (closer to the top of the axis).
    const yPx = PAD_Y + (1 - ratio) * usable;
    const iter = beeswarmSlots();
    let next = iter.next();
    while (!next.done) {
      const slot = next.value;
      const collides = placed.some(
        (p) => p.slot === slot && Math.abs(p.yPx - yPx) < PACK_SPACING,
      );
      if (!collides) {
        placed.push({ row, yPx, slot });
        break;
      }
      next = iter.next();
    }
  }
  return placed;
}

export function InsightDistributionChart({
  rows,
  formatValue,
  unitLabel,
  emptyMessage = "No data yet.",
  className,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w != null) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Dismiss the tooltip when clicking anywhere outside a dot button.
  React.useEffect(() => {
    if (!selectedKey) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest("[data-flag-button]")) return;
      setSelectedKey(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedKey]);

  if (rows.length === 0) {
    return <p className="text-[13px] text-ink-3">{emptyMessage}</p>;
  }

  const max = Math.max(...rows.map((r) => r.value));
  const min = Math.min(...rows.map((r) => r.value));
  const span = max - min;
  const plotHeight = AXIS_LENGTH;
  const placed = placeFlags(rows, plotHeight, min, span);
  const medianValue = median(rows.map((r) => r.value));
  const medianRatio = span === 0 ? 0.5 : (medianValue - min) / span;
  const usableY = Math.max(0, plotHeight - 2 * PAD_Y);
  const medianY = AXIS_LABEL_HEIGHT + PAD_Y + (1 - medianRatio) * usableY;

  // Slots are signed offsets; centerline is slot=0. +n = right of axis, -n = left.
  const slotStep = PACK_SPACING;
  const centerX = width / 2;
  const chartHeight = AXIS_LABEL_HEIGHT + plotHeight + AXIS_LABEL_HEIGHT;
  const plotTop = AXIS_LABEL_HEIGHT;
  const plotBottom = AXIS_LABEL_HEIGHT + plotHeight;

  return (
    <div ref={containerRef} className={cn("w-full select-none", className)}>
      <div className="relative" style={{ height: chartHeight }}>
        {/* Centerline axis the beeswarm clusters around. */}
        {width > 0 && (
          <div
            className="absolute w-px bg-line"
            style={{
              left: centerX,
              top: plotTop,
              height: plotHeight,
            }}
          />
        )}

        {/* Max label at top, min label at bottom — anchored to the centerline. */}
        {width > 0 && (
          <>
            <div
              className="absolute -translate-x-1/2 -translate-y-1"
              style={{ left: centerX, top: 0 }}
            >
              <span className="mono text-[10px] text-ink-faint">{formatValue(max)}</span>
            </div>
            <div
              className="absolute -translate-x-1/2 translate-y-1"
              style={{ left: centerX, top: plotBottom + 4 }}
            >
              <span className="mono text-[10px] text-ink-faint">{formatValue(min)}</span>
            </div>
            {/* End ticks at top and bottom of the axis. */}
            <div
              className="absolute h-px w-1.5 -translate-x-1/2 bg-line"
              style={{ left: centerX, top: plotTop }}
            />
            <div
              className="absolute h-px w-1.5 -translate-x-1/2 bg-line"
              style={{ left: centerX, top: plotBottom }}
            />

            {/* Median callout: dashed rule across the plot with the value
                pinned above the rule and "Average" pinned below it. */}
            <div
              className="absolute border-t border-dashed border-line-strong"
              style={{ left: 8, right: 8, top: medianY }}
            />
            <div
              className="mono absolute text-right text-[12px] font-semibold leading-tight text-ink"
              style={{
                right: 4,
                top: medianY,
                transform: "translateY(calc(-100% - 6px))",
              }}
            >
              {formatValue(medianValue)}
              {unitLabel ? ` ${unitLabel}` : ""}
            </div>
            <div
              className="mono absolute text-right text-[10px] uppercase leading-tight tracking-[0.16em] text-ink-faint"
              style={{ right: 4, top: medianY + 6 }}
            >
              Average
            </div>
          </>
        )}

        {width > 0 &&
          placed.map(({ row, yPx, slot }) => {
            const isSelected = selectedKey === row.key;
            // Slot 0 sits on the axis; +n right, -n left.
            const left = centerX + slot * slotStep - HIT_SIZE / 2;
            const top = plotTop + yPx - HIT_SIZE / 2;
            return (
              <React.Fragment key={row.key}>
                <button
                  type="button"
                  data-flag-button
                  // Hover/focus show the tooltip with no click required.
                  // Touch users still get tap-to-show via pointerenter; the
                  // pointerType guard on leave keeps the tooltip pinned until
                  // they tap elsewhere (handled by the document listener).
                  onPointerEnter={() => setSelectedKey(row.key)}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") {
                      setSelectedKey((cur) => (cur === row.key ? null : cur));
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onFocus={() => setSelectedKey(row.key)}
                  onBlur={() =>
                    setSelectedKey((cur) => (cur === row.key ? null : cur))
                  }
                  aria-label={`${row.label}: ${formatValue(row.value)}`}
                  aria-expanded={isSelected}
                  className={cn(
                    "absolute flex items-center justify-center rounded-full transition-transform",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
                    isSelected ? "z-20 scale-[1.35]" : "z-10 hover:scale-110",
                  )}
                  style={{
                    left,
                    top,
                    width: HIT_SIZE,
                    height: HIT_SIZE,
                  }}
                >
                  <span
                    aria-hidden
                    className="block rounded-full ring-1 ring-black/10"
                    style={{
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      backgroundColor: getFlagPrimaryColor(row.key),
                      border: `${DOT_BORDER}px solid ${getFlagSecondaryColor(row.key)}`,
                      boxSizing: "border-box",
                    }}
                  />
                </button>
                {isSelected && (
                  <div
                    role="status"
                    className={cn(
                      "pointer-events-none absolute z-30 whitespace-nowrap",
                      "flex items-center gap-1.5 rounded-pill bg-ink px-2.5 py-1 text-[11px] font-medium text-bg shadow-2",
                    )}
                    style={{
                      // Pin tooltip to the right of the dot, vertically centered.
                      left: left + HIT_SIZE + 8,
                      top: top + HIT_SIZE / 2,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <span aria-hidden>{row.flagEmoji}</span>
                    <span className="mono">{row.label}</span>
                    <span>{formatValue(row.value)}</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
      </div>
    </div>
  );
}
