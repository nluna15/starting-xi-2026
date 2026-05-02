import type { Player } from "@/lib/db/schema";
import { formatAge, formatEur } from "@/lib/utils";

export function computeAverages(picks: (Player | null)[]) {
  const present = picks.filter((p): p is Player => Boolean(p));
  if (present.length === 0) return { age: null, value: null, count: 0 };
  const ageSum = present.reduce((s, p) => s + p.age, 0);
  const valSum = present.reduce((s, p) => s + p.marketValueEur, 0);
  return {
    age: ageSum / present.length,
    value: valSum / present.length,
    count: present.length,
  };
}

type Props = {
  starters: (Player | null)[];
  bench: (Player | null)[];
  formationName: string;
};

export function LineupSummary({ starters, bench, formationName }: Props) {
  const startersAvg = computeAverages(starters);
  const allAvg = computeAverages([...starters, ...bench]);
  const filled = starters.filter(Boolean).length + bench.filter(Boolean).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Filled" value={`${filled} / 14`} />
      <Stat label="Formation" value={formationName} />
      <Stat label="Avg age (XI)" value={formatAge(startersAvg.age)} />
      <Stat label="Avg value (squad)" value={formatEur(allAvg.value)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}
