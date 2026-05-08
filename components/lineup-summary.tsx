import type { Player } from "@/lib/db/schema";

export function computeAverages(picks: (Player | null)[]) {
  const present = picks.filter((p): p is Player => Boolean(p));
  if (present.length === 0) return { age: null, value: null, caps: null, count: 0 };
  const ageSum = present.reduce((s, p) => s + p.age, 0);
  const valSum = present.reduce((s, p) => s + p.marketValueEur, 0);
  const withCaps = present.filter((p) => p.internationalCaps != null);
  const capsSum = withCaps.reduce((s, p) => s + (p.internationalCaps ?? 0), 0);
  return {
    age: ageSum / present.length,
    value: valSum / present.length,
    caps: withCaps.length === 0 ? null : capsSum / withCaps.length,
    count: present.length,
  };
}
