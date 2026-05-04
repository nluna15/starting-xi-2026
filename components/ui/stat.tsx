import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

/* -----------------------------------------------------------------------------
   Stat — handoff §3 (stat label / stat value rows).
   - Value: mono, tabular numerals via the `.mono` utility (font-mono is good
     enough — `.mono` activates `tnum` feature settings).
   - Label: condensed, uppercase, tracked, ink-3 12px (slightly above the 9–11
     guide range so it works as a standalone tile label without help text).
   - `align` controls horizontal alignment; default `start` matches recent
     "left-align stat card text" change.
   ----------------------------------------------------------------------------- */

type StatSize = "sm" | "md" | "lg";
type Align = "start" | "center" | "end";

export interface StatProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  size?: StatSize;
  align?: Align;
}

const VALUE_SIZE: Record<StatSize, string> = {
  sm: "text-[14px] font-bold",
  md: "text-[20px] font-bold",
  lg: "text-[28px] font-bold",
};

const ALIGN_CLASS: Record<Align, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

export function Stat({
  label,
  value,
  hint,
  size = "md",
  align = "start",
  className,
  ...rest
}: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", ALIGN_CLASS[align], className)} {...rest}>
      <span className="cond text-[12px] text-ink-3">{label}</span>
      <span className={cn("mono text-ink", VALUE_SIZE[size])}>{value}</span>
      {hint != null && <span className="text-[11px] text-ink-faint">{hint}</span>}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   StatTile — Card + Stat composed for grid layouts.
   ----------------------------------------------------------------------------- */
export interface StatTileProps extends StatProps {
  padding?: React.ComponentProps<typeof Card>["padding"];
}

export function StatTile({ padding = "default", className, ...statProps }: StatTileProps) {
  return (
    <Card padding={padding} className={className}>
      <Stat {...statProps} />
    </Card>
  );
}
