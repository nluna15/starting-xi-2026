import { RecentSubmissionsFeed } from "@/components/community/recent-submissions-feed";
import { CountryTile } from "@/components/country-tile";
import { HeroCard } from "@/components/home/hero-card";
import { HowItWorks } from "@/components/home/how-it-works";
import { Leaderboard } from "@/components/home/leaderboard";
import { NationCarousel, type CarouselTile } from "@/components/home/nation-carousel";
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

const PRIMARY_CODES = ["USA", "MEX", "ARG", "FRA"] as const;
const CAROUSEL_CODES = ["ENG", "GER", "BRA", "MAR"] as const;

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

  const primaryTiles = PRIMARY_CODES.map((code) => resolveTile(code, statusByCode)).filter(
    (t): t is ResolvedTile => t !== null,
  );
  const carouselTiles: CarouselTile[] = CAROUSEL_CODES.map((code) =>
    resolveTile(code, statusByCode),
  )
    .filter((t): t is ResolvedTile => t !== null)
    .map((t) => ({ code: t.code, name: t.name, flagEmoji: t.flagEmoji, enabled: t.status === "ready" }));

  return (
    <div className="space-y-8 py-2">
      <HeroCard
        totalSubmissions={totalSubmissions}
        daysUntilKickoff={daysUntilKickoff()}
      />

      <section id="pick-your-nation" className="space-y-3">
        <SectionHeading title="Build your lineup" />
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {primaryTiles.map((tile) => (
            <li key={tile.code}>
              <CountryTile
                code={tile.code}
                name={tile.name}
                flagEmoji={tile.flagEmoji}
                enabled={tile.status === "ready"}
                layout="card"
                size="lg"
                borderless
              />
            </li>
          ))}
        </ul>
        <NationCarousel tiles={carouselTiles} viewAllHref="/countries" />
      </section>

      <HowItWorks />

      <ExploreLineupCarousel cards={exploreCards} />

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

