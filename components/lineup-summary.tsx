import type { Player } from "@/lib/db/schema";

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
