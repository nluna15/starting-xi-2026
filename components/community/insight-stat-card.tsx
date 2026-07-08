"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { HorizontalBarChart, type BarRow } from "@/components/horizontal-bar-chart";
import { trackEvent } from "@/lib/track";
import { InsightDistributionChart } from "./insight-distribution-chart";

type ValueFormat = "decimal" | "eurCompact";

function formatValueFor(format: ValueFormat, v: number): string {
  if (format === "eurCompact") {
    if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
    return `€${Math.round(v)}`;
  }
  return v.toFixed(1);
}

export type InsightSegment = {
  subhead: string;
  rows: BarRow[];
};

type Props = {
  title: string;
  segments: InsightSegment[];
  /** Full ranking, already sorted highest → lowest. */
  allRows: BarRow[];
  format: ValueFormat;
  /** Optional unit suffix shown after the median value in the modal callout. */
  unitLabel?: string;
  /** Defaults to the card title. Used in the modal header. */
  modalTitle?: string;
};

export function InsightStatCard({
  title,
  segments,
  allRows,
  format,
  unitLabel,
  modalTitle,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const fmt = React.useCallback((v: number) => formatValueFor(format, v), [format]);

  return (
    <>
      <Card as="section">
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
          <h2 className="cond text-[13px] text-ink">{title}</h2>
          <button
            type="button"
            onClick={() => {
              trackEvent("community_insight_expand", `/community#${title.toLowerCase()}`);
              setOpen(true);
            }}
            aria-label={`View all ${title.toLowerCase()} rankings`}
            className="mono -my-1 -mr-1 rounded-pill px-2 py-1 text-[11px] font-medium tracking-[0.16em] text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft focus-visible:text-ink"
          >
            View all
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {segments.map((seg, i) => (
            <React.Fragment key={seg.subhead}>
              <h3
                className={`mono text-[11px] font-medium tracking-[0.16em] text-ink-faint${
                  i > 0 ? " mt-2" : ""
                }`}
              >
                {seg.subhead}
              </h3>
              <HorizontalBarChart rows={seg.rows} formatValue={fmt} />
            </React.Fragment>
          ))}
        </div>
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={modalTitle ?? title}
        size="md"
        // On narrow phones, pin the sheet to 90% of the viewport so the full
        // distribution chart is visible with room to spare beneath it.
        className="max-[410px]:h-[90dvh]"
      >
        <div className="max-h-[70dvh] overflow-y-auto px-6 py-4 max-[410px]:max-h-none max-[410px]:overflow-y-visible">
          <p className="mb-3 text-[12px] leading-snug text-ink-3">
            Each country&rsquo;s figure is the average across every player picked &mdash;
            starters and substitutes &mdash; in community-submitted lineups for that country.
            Hover or tap a dot to see the exact value.
          </p>
          <InsightDistributionChart rows={allRows} formatValue={fmt} unitLabel={unitLabel} />
        </div>
      </Modal>
    </>
  );
}
