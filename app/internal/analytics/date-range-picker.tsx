"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Current window bounds as YYYY-MM-DD (inclusive `to`). */
  from: string;
  to: string;
};

/** Formats a Date as a UTC YYYY-MM-DD string. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

export function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  // Seeded from props; the parent remounts this component (via `key`) whenever
  // the applied window changes, so local edits reset to the new bounds.
  const [localFrom, setLocalFrom] = React.useState(from);
  const [localTo, setLocalTo] = React.useState(to);

  function apply(next: { from: string; to: string }) {
    router.push(`/internal/analytics?from=${next.from}&to=${next.to}`);
  }

  const inputCls = cn(
    "rounded-md border border-line bg-bg px-2.5 py-1.5 text-[13px] text-ink",
    "transition-[border-color,box-shadow] duration-150 ease-in-out",
    "hover:border-line-strong",
    "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
  );
  const presetCls = cn(
    "mono rounded-pill border border-line px-2.5 py-1 text-[11px] tracking-[0.08em] text-ink-3",
    "transition-colors hover:border-accent hover:text-accent-deep",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="range-from" className="cond text-[11px] tracking-[0.08em] text-ink-faint">
          From
        </label>
        <input
          id="range-from"
          type="date"
          value={localFrom}
          max={localTo}
          onChange={(e) => setLocalFrom(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="range-to" className="cond text-[11px] tracking-[0.08em] text-ink-faint">
          To
        </label>
        <input
          id="range-to"
          type="date"
          value={localTo}
          min={localFrom}
          onChange={(e) => setLocalTo(e.target.value)}
          className={inputCls}
        />
      </div>
      <Button
        size="sm"
        variant="secondary"
        disabled={!localFrom || !localTo || localFrom > localTo}
        onClick={() => apply({ from: localFrom, to: localTo })}
      >
        Apply
      </Button>
      <div className="flex items-center gap-1.5 pb-0.5">
        <button type="button" className={presetCls} onClick={() => apply(presetRange(7))}>
          7d
        </button>
        <button type="button" className={presetCls} onClick={() => apply(presetRange(30))}>
          30d
        </button>
        <button type="button" className={presetCls} onClick={() => apply(presetRange(90))}>
          90d
        </button>
      </div>
    </div>
  );
}
