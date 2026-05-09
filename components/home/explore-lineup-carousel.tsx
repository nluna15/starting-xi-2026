import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/section-heading";

export type ExploreCard = {
  code: string;
  name: string;
  flagEmoji: string;
  topFormation: string | null;
  statType: "age" | "value" | "substitute";
  avgAge: number | null;
  avgValue: number | null;
  topSubstituteName: string | null;
};

type Props = {
  cards: ExploreCard[];
};

export function ExploreLineupCarousel({ cards }: Props) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeading title="Explore Lineup Data" />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map((card) => (
          <li key={card.code}>
            <Link
              href={`/community/${card.code}`}
              aria-label={`Explore ${card.name} lineup data`}
              className="block h-full rounded-md text-ink no-underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft"
            >
              <Card padding="default" className="flex h-full flex-col gap-2 hover:-translate-y-0.5 hover:shadow-2 transition-[box-shadow,transform] duration-200 ease-out cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-2xl leading-none" aria-hidden>
                    {card.flagEmoji}
                  </span>
                  <span className="cond truncate text-[13px] font-bold text-ink">
                    {card.name}
                  </span>
                </div>
                {card.topFormation && (
                  <p className="mono text-[11px] font-medium tracking-[0.14em] text-ink-faint">
                    {card.topFormation}
                  </p>
                )}
                <p className="mt-auto text-[12px] text-ink-3">
                  <span className="mono font-medium">{formatStat(card)}</span>
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatStat(card: ExploreCard): string {
  if (card.statType === "age" && card.avgAge != null) {
    return `Avg age: ${card.avgAge.toFixed(1)} yrs`;
  }
  if (card.statType === "value" && card.avgValue != null) {
    return `Avg value: ${formatEurCompact(card.avgValue)}`;
  }
  if (card.statType === "substitute" && card.topSubstituteName) {
    return `Top sub: ${abbreviateName(card.topSubstituteName)}`;
  }
  if (card.avgAge != null) return `Avg age: ${card.avgAge.toFixed(1)} yrs`;
  if (card.avgValue != null) return `Avg value: ${formatEurCompact(card.avgValue)}`;
  return "";
}

function formatEurCompact(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${Math.round(v)}`;
}

function abbreviateName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}
