import { cn } from "@/lib/utils";

export type BarRow = {
  key: string;
  label: string;
  flagEmoji: string;
  value: number;
};

type Props = {
  rows: BarRow[];
  formatValue: (value: number) => string;
  emptyMessage?: string;
  className?: string;
};

export function HorizontalBarChart({
  rows,
  formatValue,
  emptyMessage = "No data yet.",
  className,
}: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-300">{emptyMessage}</p>;
  }

  const max = Math.max(...rows.map((r) => r.value));
  const min = Math.min(...rows.map((r) => r.value));
  const denom = max - min || max || 1;

  return (
    <ul className={cn("space-y-1.5 text-xs text-white", className)}>
      {rows.map((r) => {
        const ratio = max === min ? 1 : (r.value - min) / denom;
        const widthPct = 8 + ratio * 92;
        return (
          <li key={r.key} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-2">
            <span className="flex items-center gap-1 truncate" title={r.label}>
              <span aria-hidden>{r.flagEmoji}</span>
              <span className="font-medium">{r.label}</span>
            </span>
            <span className="h-2.5 w-full rounded-sm bg-black/20">
              <span
                className="block h-full rounded-sm bg-[var(--accent)]"
                style={{ width: `${widthPct}%` }}
              />
            </span>
            <span className="tabular-nums text-right">{formatValue(r.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
