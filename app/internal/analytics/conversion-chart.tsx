"use client";

import * as React from "react";
import type { ConversionBucket } from "@/lib/db/analytics";

/* Vertical bar chart of funnel conversion per 3-day bucket. Hand-built SVG —
   single series in the accent hue, recessive hairline grid, per-bar tooltip on
   hover/focus, and a <details> table so every value is reachable without
   either. */

const M = { top: 18, right: 8, bottom: 24, left: 36 };
const PLOT_H = 200;
const SVG_H = M.top + PLOT_H + M.bottom;

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Jul 3 – Jul 5" for an [start, end) bucket, collapsing 1-day buckets. */
function rangeLabel(b: ConversionBucket): string {
  const startLabel = monthDay.format(utcDate(b.start));
  const lastDay = new Date(utcDate(b.end).getTime() - 86400_000);
  const endLabel = monthDay.format(lastDay);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function pctLabel(rate: number): string {
  const pct = rate * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

/** Bar with rounded top corners, square at the baseline. */
function barPath(x: number, yTop: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  const bottom = yTop + h;
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${yTop + r}`,
    `Q ${x} ${yTop} ${x + r} ${yTop}`,
    `L ${x + w - r} ${yTop}`,
    `Q ${x + w} ${yTop} ${x + w} ${yTop + r}`,
    `L ${x + w} ${bottom}`,
    "Z",
  ].join(" ");
}

export function ConversionChart({ buckets }: { buckets: ConversionBucket[] }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(720);
  const [active, setActive] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (buckets.every((b) => b.builders === 0)) {
    return <p className="text-[13px] text-ink-3">No build-page views in this window yet.</p>;
  }

  const n = buckets.length;
  const plotW = Math.max(40, width - M.left - M.right);
  const band = plotW / n;
  const barW = Math.min(24, Math.max(2, band * 0.6));

  const maxPct = Math.max(...buckets.map((b) => (b.rate ?? 0) * 100));
  const yMax = Math.min(100, Math.max(10, Math.ceil(maxPct / 10) * 10));
  const tickStep = yMax <= 20 ? 5 : yMax <= 50 ? 10 : 20;
  const ticks: number[] = [];
  for (let t = 0; t <= yMax; t += tickStep) ticks.push(t);

  const yFor = (pct: number) => M.top + PLOT_H - (pct / yMax) * PLOT_H;
  const centerFor = (i: number) => M.left + i * band + band / 2;
  const baseline = M.top + PLOT_H;

  // Thin x labels past 8 buckets, always keeping the first and last (and
  // dropping a stride label that would crowd the last one).
  const stride = Math.max(1, Math.ceil(n / 8));
  const showXLabel = (i: number) =>
    i === 0 || i === n - 1 || (i % stride === 0 && n - 1 - i >= stride / 2);

  // Direct labels only on the max bucket and the final bucket with data.
  const maxIdx = buckets.reduce(
    (best, b, i) => ((b.rate ?? -1) > (buckets[best]?.rate ?? -1) ? i : best),
    0,
  );
  let lastIdx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (buckets[i].rate != null) {
      lastIdx = i;
      break;
    }
  }
  const showCapLabel = (i: number) => buckets[i].rate != null && (i === maxIdx || i === lastIdx);

  const activeBucket = active != null ? buckets[active] : null;
  const tooltipX =
    active != null ? Math.min(Math.max(centerFor(active), 70), Math.max(70, width - 70)) : 0;
  const tooltipY =
    activeBucket != null ? yFor((activeBucket.rate ?? 0) * 100) : 0;

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative">
        <svg width={width} height={SVG_H} role="group" aria-label="Conversion rate by 3-day period">
          {/* Grid + y ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={width - M.right}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text
                x={M.left - 6}
                y={yFor(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="mono"
                fontSize={10}
                fill="var(--ink-faint)"
              >
                {t}%
              </text>
            </g>
          ))}

          {/* Bars */}
          {buckets.map((b, i) => {
            const cx = centerFor(i);
            const x = cx - barW / 2;
            if (b.rate == null) {
              // No builders: a baseline tick, visibly distinct from a 0% bar.
              return (
                <line
                  key={b.start}
                  x1={cx - 2}
                  x2={cx + 2}
                  y1={baseline}
                  y2={baseline}
                  stroke="var(--ink-mute)"
                  strokeWidth={2}
                />
              );
            }
            const h = Math.max(2, (b.rate * 100 / yMax) * PLOT_H);
            return (
              <path
                key={b.start}
                d={barPath(x, baseline - h, barW, h)}
                fill="var(--accent)"
                stroke={active === i ? "var(--accent-deep)" : "none"}
                strokeWidth={active === i ? 1.5 : 0}
              />
            );
          })}

          {/* Cap labels (sparing: max + latest only) */}
          {buckets.map((b, i) =>
            showCapLabel(i) ? (
              <text
                key={b.start}
                x={centerFor(i)}
                y={yFor((b.rate ?? 0) * 100) - 5}
                textAnchor="middle"
                className="mono"
                fontSize={10}
                fill="var(--ink-2)"
              >
                {pctLabel(b.rate ?? 0)}
              </text>
            ) : null,
          )}

          {/* X labels */}
          {buckets.map((b, i) =>
            showXLabel(i) ? (
              <text
                key={b.start}
                x={centerFor(i)}
                y={baseline + 15}
                textAnchor="middle"
                fontSize={10}
                fill="var(--ink-faint)"
              >
                {monthDay.format(utcDate(b.start))}
              </text>
            ) : null,
          )}

          {/* Hit targets: full band × full plot, wider than the bar */}
          {buckets.map((b, i) => (
            <rect
              key={b.start}
              x={M.left + i * band}
              y={M.top}
              width={band}
              height={PLOT_H}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={
                b.rate == null
                  ? `${rangeLabel(b)}: no builders in this period`
                  : `${rangeLabel(b)}: ${pctLabel(b.rate)} conversion, ${b.converters} of ${b.builders} builders`
              }
              className="focus:outline-none"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
            />
          ))}
        </svg>

        {/* Tooltip — HTML so it wraps and never clips inside the SVG */}
        {activeBucket && (
          <div
            className="pointer-events-none absolute z-10 min-w-[120px] rounded-md border border-line bg-surface px-2.5 py-1.5 shadow-2"
            style={{ left: tooltipX, top: tooltipY - 10, transform: "translate(-50%, -100%)" }}
          >
            <div className="mono text-[15px] leading-tight text-ink">
              {activeBucket.rate == null ? "—" : pctLabel(activeBucket.rate)}
            </div>
            <div className="text-[11px] text-ink-3">{rangeLabel(activeBucket)}</div>
            <div className="text-[11px] text-ink-faint">
              {activeBucket.builders === 0
                ? "No builders in this period"
                : `${activeBucket.converters} of ${activeBucket.builders} builders`}
            </div>
          </div>
        )}
      </div>

      {/* Every value, reachable without hover */}
      <details>
        <summary className="cursor-pointer text-[11px] text-ink-faint hover:text-ink-3">
          View as table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="cond px-3.5 py-2 text-left text-[11px] tracking-[0.1em] text-ink-faint">
                  Period
                </th>
                <th className="cond px-3.5 py-2 text-right text-[11px] tracking-[0.1em] text-ink-faint">
                  Builders
                </th>
                <th className="cond px-3.5 py-2 text-right text-[11px] tracking-[0.1em] text-ink-faint">
                  Converters
                </th>
                <th className="cond px-3.5 py-2 text-right text-[11px] tracking-[0.1em] text-ink-faint">
                  Conversion
                </th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.start} className="border-b border-line last:border-0">
                  <td className="px-3.5 py-2 text-ink-2">{rangeLabel(b)}</td>
                  <td className="mono px-3.5 py-2 text-right text-ink">{b.builders}</td>
                  <td className="mono px-3.5 py-2 text-right text-ink">{b.converters}</td>
                  <td className="mono px-3.5 py-2 text-right text-ink">
                    {b.rate == null ? "—" : pctLabel(b.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
