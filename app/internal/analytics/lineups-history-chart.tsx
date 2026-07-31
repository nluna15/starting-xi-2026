"use client";

import * as React from "react";
import type { LineupsHistoryPoint } from "@/lib/db/analytics";

/* Vertical bar chart of lineups submitted per UTC day. Hand-built SVG, same
   shape as ConversionChart — single series in the accent hue, recessive
   hairline grid, per-bar tooltip on hover/focus, and a <details> table so
   every value is reachable without either. */

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

export function LineupsHistoryChart({ points }: { points: LineupsHistoryPoint[] }) {
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

  if (points.every((p) => p.count === 0)) {
    return <p className="text-[13px] text-ink-3">No lineups submitted in this window yet.</p>;
  }

  const n = points.length;
  const plotW = Math.max(40, width - M.left - M.right);
  const band = plotW / n;
  const barW = Math.min(24, Math.max(2, band * 0.6));

  const maxCount = Math.max(...points.map((p) => p.count));
  const yMax = Math.max(1, maxCount);
  const tickStep = Math.max(1, Math.ceil(yMax / 4));
  const ticks: number[] = [];
  for (let t = 0; t <= yMax; t += tickStep) ticks.push(t);

  const yFor = (count: number) => M.top + PLOT_H - (count / yMax) * PLOT_H;
  const centerFor = (i: number) => M.left + i * band + band / 2;
  const baseline = M.top + PLOT_H;

  // Thin x labels past 8 points, always keeping the first and last.
  const stride = Math.max(1, Math.ceil(n / 8));
  const showXLabel = (i: number) =>
    i === 0 || i === n - 1 || (i % stride === 0 && n - 1 - i >= stride / 2);

  const maxIdx = points.reduce((best, p, i) => (p.count > points[best].count ? i : best), 0);

  const activePoint = active != null ? points[active] : null;
  const tooltipX =
    active != null ? Math.min(Math.max(centerFor(active), 70), Math.max(70, width - 70)) : 0;
  const tooltipY = activePoint != null ? yFor(activePoint.count) : 0;

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative">
        <svg width={width} height={SVG_H} role="group" aria-label="Lineups submitted by day">
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
                {t}
              </text>
            </g>
          ))}

          {/* Bars */}
          {points.map((p, i) => {
            const cx = centerFor(i);
            const x = cx - barW / 2;
            if (p.count === 0) {
              return (
                <line
                  key={p.date}
                  x1={cx - 2}
                  x2={cx + 2}
                  y1={baseline}
                  y2={baseline}
                  stroke="var(--ink-mute)"
                  strokeWidth={2}
                />
              );
            }
            const h = Math.max(2, (p.count / yMax) * PLOT_H);
            return (
              <path
                key={p.date}
                d={barPath(x, baseline - h, barW, h)}
                fill="var(--accent)"
                stroke={active === i ? "var(--accent-deep)" : "none"}
                strokeWidth={active === i ? 1.5 : 0}
              />
            );
          })}

          {/* Cap label on the peak day */}
          <text
            x={centerFor(maxIdx)}
            y={yFor(points[maxIdx].count) - 5}
            textAnchor="middle"
            className="mono"
            fontSize={10}
            fill="var(--ink-2)"
          >
            {points[maxIdx].count}
          </text>

          {/* X labels */}
          {points.map((p, i) =>
            showXLabel(i) ? (
              <text
                key={p.date}
                x={centerFor(i)}
                y={baseline + 15}
                textAnchor="middle"
                fontSize={10}
                fill="var(--ink-faint)"
              >
                {monthDay.format(utcDate(p.date))}
              </text>
            ) : null,
          )}

          {/* Hit targets: full band × full plot, wider than the bar */}
          {points.map((p, i) => (
            <rect
              key={p.date}
              x={M.left + i * band}
              y={M.top}
              width={band}
              height={PLOT_H}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${monthDay.format(utcDate(p.date))}: ${p.count} lineup${p.count === 1 ? "" : "s"}`}
              className="focus:outline-none"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
            />
          ))}
        </svg>

        {/* Tooltip — HTML so it wraps and never clips inside the SVG */}
        {activePoint && (
          <div
            className="pointer-events-none absolute z-10 min-w-[120px] rounded-md border border-line bg-surface px-2.5 py-1.5 shadow-2"
            style={{ left: tooltipX, top: tooltipY - 10, transform: "translate(-50%, -100%)" }}
          >
            <div className="mono text-[15px] leading-tight text-ink">
              {activePoint.count} lineup{activePoint.count === 1 ? "" : "s"}
            </div>
            <div className="text-[11px] text-ink-3">{monthDay.format(utcDate(activePoint.date))}</div>
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
                  Day
                </th>
                <th className="cond px-3.5 py-2 text-right text-[11px] tracking-[0.1em] text-ink-faint">
                  Lineups
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-b border-line last:border-0">
                  <td className="px-3.5 py-2 text-ink-2">{p.date}</td>
                  <td className="mono px-3.5 py-2 text-right text-ink">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
