import Link from "next/link";
import { RecentSubmissionsFeed } from "@/components/community/recent-submissions-feed";
import { CountryTile } from "@/components/country-tile";
import { HeroCard } from "@/components/home/hero-card";
import { HowItWorks } from "@/components/home/how-it-works";
import { Leaderboard } from "@/components/home/leaderboard";
import { SectionHeading } from "@/components/home/section-heading";
import {
  ExploreLineupCarousel,
  type ExploreCard,
} from "@/components/home/explore-lineup-carousel";
import {
  getCrowdStats,
  getCountrySquadStats,
  getHomeLeaderboard,
  getRecentSubmissions,
  getRosterStatusByCode,
  getTotalSubmissionCount,
  type RosterStatus,
} from "@/lib/db/queries";
import { daysUntilKickoff } from "@/lib/kickoff";
import { WC_2026_SLOTS } from "@/lib/wc-2026-teams";

export const dynamic = "force-dynamic";

const NATION_CODES = ["USA", "MEX", "ARG", "FRA", "ENG", "GER", "BRA", "MAR"] as const;
const HIDE_BELOW_410 = new Set(["GER", "BRA", "MAR"]);

export default async function Home() {
  const [statusByCode, totalSubmissions, leaderboard, recentSubmissions, allCountryStats] =
    await Promise.all([
      getRosterStatusByCode(),
      getTotalSubmissionCount(),
      getHomeLeaderboard(),
      getRecentSubmissions(4),
      getCountrySquadStats(),
    ]);

  // Randomly pick up to 4 countries that have submissions
  const shuffled = allCountryStats
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  const crowdStatResults = await Promise.all(shuffled.map((c) => getCrowdStats(c.code)));

  const statTypes: ExploreCard["statType"][] = ["age", "value", "substitute"];
  const exploreCards: ExploreCard[] = shuffled.map((country, i) => {
    const crowd = crowdStatResults[i];
    const statType = statTypes[Math.floor(Math.random() * statTypes.length)];
    return {
      code: country.code,
      name: country.name,
      flagEmoji: country.flagEmoji,
      topFormation: crowd.topFormation?.name ?? null,
      statType,
      avgAge: country.avgAge,
      avgValue: country.avgMarketValueEur,
      topSubstituteName: crowd.topBench[0]?.player.fullName ?? null,
    };
  });

  const nationTiles = NATION_CODES.map((code) => resolveTile(code, statusByCode)).filter(
    (t): t is ResolvedTile => t !== null,
  );

  return (
    <div className="space-y-8 py-2">
      <HeroCard
        totalSubmissions={totalSubmissions}
        daysUntilKickoff={daysUntilKickoff()}
      />

      <section id="pick-your-nation" className="space-y-3">
        <SectionHeading title="Build your lineup" />
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {nationTiles.map((tile) => (
            <li key={tile.code} className={HIDE_BELOW_410.has(tile.code) ? "max-[409px]:hidden" : undefined}>
              <CountryTile
                code={tile.code}
                name={tile.code}
                flagEmoji={tile.flagEmoji}
                enabled={tile.status === "ready"}
                layout="card"
                size="md"
                borderless
                showComingSoon={false}
              />
            </li>
          ))}
          <li>
            <ViewAllNationsTile href="/countries" />
          </li>
        </ul>
      </section>

      <ExploreLineupCarousel cards={exploreCards} />

      <HowItWorks />

      <Leaderboard data={leaderboard} />

      <RecentSubmissionsFeed
        submissions={recentSubmissions}
        title="Recently Shared Lineups"
      />
    </div>
  );
}

type ResolvedTile = {
  code: string;
  name: string;
  flagEmoji: string;
  status: RosterStatus;
};

function resolveTile(code: string, statusByCode: Map<string, RosterStatus>): ResolvedTile | null {
  const slot = WC_2026_SLOTS.find((s) => s.kind === "confirmed" && s.code === code);
  if (!slot || slot.kind !== "confirmed") return null;
  return {
    code: slot.code,
    name: slot.name,
    flagEmoji: slot.flagEmoji,
    status: statusByCode.get(slot.code) ?? "missing",
  };
}

function ViewAllNationsTile({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="View all nations"
      className="block rounded-md text-ink no-underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft"
    >
      <div className="flex h-24 flex-col items-center justify-center gap-[1px] rounded-md bg-surface-2 px-3 text-center text-ink transition-[background-color,border-color,color] duration-150 ease-in-out hover:bg-accent-soft hover:text-accent-deep">
        <span className="text-2xl leading-none" aria-hidden>
          🌍
        </span>
        <div className="flex flex-col items-center gap-0.5">
          <span className="cond text-[12px] font-bold leading-tight">View All</span>
          <span className="cond text-[12px] font-bold leading-tight">Nations</span>
        </div>
      </div>
    </Link>
  );
}

