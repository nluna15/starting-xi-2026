import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CommunityCountryCarousel } from "@/components/community/country-carousel";
import { CommunityPitch } from "@/components/community-pitch";
import {
  getCountrySquadStats,
  getCrowdStats,
  getRosterStatusByCode,
} from "@/lib/db/queries";
import { formatAge, formatEur } from "@/lib/utils";
import { FIFA_TO_ISO2, WC_2026_SLOTS } from "@/lib/wc-2026-teams";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Params = { country: string };

export default async function CommunityCountryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country } = await params;
  const code = country.toUpperCase();

  const [stats, countryStats, statusByCode] = await Promise.all([
    getCrowdStats(code),
    getCountrySquadStats(),
    getRosterStatusByCode(),
  ]);

  if (!stats.team) notFound();

  const team = stats.team;
  const isoCountryCode = FIFA_TO_ISO2[team.code] ?? null;

  const readyCodes = WC_2026_SLOTS.flatMap((s) =>
    s.kind === "confirmed" && statusByCode.get(s.code) === "ready" ? [s.code] : [],
  );

  const submitHref = `/${team.code}/build`;
  const submitLabel = `Submit ${team.code} best XI`;

  if (stats.totalSubmissions === 0) {
    return (
      <div className="space-y-8">
        <CommunityCountryCarousel
          slots={WC_2026_SLOTS}
          readyCodes={readyCodes}
          linkMode="community"
          activeCode={team.code}
          allNationsHref="/community"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            {team.flagEmoji}
          </span>
          <h1 className="display text-[44px] text-ink [text-wrap:balance] sm:text-[52px]">
            No submissions yet for {team.name}
          </h1>
          <p className="max-w-md text-[14px] text-ink-3">
            Be the first to submit a {team.name} XI and this page will start to
            fill in.
          </p>
          <Link href={submitHref}>
            <Button>{submitLabel}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const slots = stats.mostLikelyXi.slots;
  const startersResolved = slots.map((s) =>
    s.player
      ? {
          id: s.player.id,
          fullName: s.player.fullName,
          photoUrl: s.player.photoUrl,
          countryCode: isoCountryCode,
          age: s.player.age,
          marketValueEur: s.player.marketValueEur,
          club: s.player.club,
        }
      : null,
  );

  const formationDef = stats.mostLikelyXi.formation
    ? {
        name: stats.mostLikelyXi.formation.name,
        slots: stats.mostLikelyXi.formation.slots,
      }
    : null;

  const startersIdSet = new Set(
    slots.flatMap((s) => (s.player ? [s.player.id] : [])),
  );
  const subs = stats.topBench
    .filter((b) => !startersIdSet.has(b.player.id))
    .slice(0, 3);
  const benchResolved = subs.map((s) => ({
    id: s.player.id,
    fullName: s.player.fullName,
    photoUrl: s.player.photoUrl,
    countryCode: isoCountryCode,
    age: s.player.age,
    marketValueEur: s.player.marketValueEur,
    club: s.player.club,
  }));

  // Pick-weighted community-wide averages so a tiny single-submission country
  // doesn't dominate. Each country's avg counts proportionally to its pickCount.
  const totalPicks = countryStats.reduce((sum, c) => sum + c.pickCount, 0);
  const communityAvgAge =
    totalPicks > 0
      ? countryStats.reduce((sum, c) => sum + c.avgAge * c.pickCount, 0) /
        totalPicks
      : null;
  const communityAvgValue =
    totalPicks > 0
      ? countryStats.reduce(
          (sum, c) => sum + c.avgMarketValueEur * c.pickCount,
          0,
        ) / totalPicks
      : null;

  return (
    <div className="space-y-10">
      <CommunityCountryCarousel
        slots={WC_2026_SLOTS}
        readyCodes={readyCodes}
        linkMode="community"
        activeCode={team.code}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
            <span aria-hidden>{team.flagEmoji}</span> {team.code}
            {stats.topFormation ? ` · ${stats.topFormation.name}` : ""}
          </p>
          <h1 className="display text-[44px] text-ink [text-wrap:balance] sm:text-[52px]">
            {team.name}&rsquo;s Best 11
          </h1>
          <p className="mono text-[11px] tracking-[0.16em] text-ink-faint">
            From {stats.totalSubmissions.toLocaleString()}{" "}
            {stats.totalSubmissions === 1 ? "submission" : "submissions"}
          </p>
        </div>
        <Link href={submitHref} className="sm:shrink-0">
          <Button size="lg">{submitLabel}</Button>
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {formationDef && (
            <div className="mx-auto w-[81%] max-w-[420px] pb-10 lg:max-w-[560px]">
              <CommunityPitch
                formation={formationDef}
                starters={startersResolved}
                bench={benchResolved}
                showPhotos
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <StatCard title="Most-popular formation">
            <div className="display text-[34px] text-ink">
              {stats.topFormation?.name ?? "—"}
            </div>
            <ul className="mt-2 space-y-1">
              {stats.formationCounts.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="cond text-[12px] font-bold text-ink">{f.name}</span>
                  <span className="mono text-[12px] text-ink-3">
                    {f.count} (
                    {Math.round((f.count / stats.totalSubmissions) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </StatCard>

          <StatCard title="Most-popular players">
            <ol className="space-y-2">
              {stats.topPlayers.length === 0 && (
                <li className="text-[13px] text-ink-3">No data yet.</li>
              )}
              {stats.topPlayers.map((b, i) => (
                <li
                  key={b.player.id}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="mono w-5 shrink-0 text-[12px] text-ink-faint">
                      {i + 1}.
                    </span>
                    <span className="truncate font-medium text-ink">
                      {b.player.fullName}
                    </span>
                    <span className="mono text-[11px] text-ink-faint">
                      {b.player.detailedPosition}
                    </span>
                  </span>
                  <span className="mono text-[12px] text-ink-2">
                    {Math.round(b.rate * 100)}%
                  </span>
                </li>
              ))}
            </ol>
          </StatCard>

          <AverageCard
            title="Average squad age"
            value={formatAge(stats.averages.age)}
            communityLabel={`Community avg ${formatAge(communityAvgAge)}`}
          />
          <AverageCard
            title="Average market value per player"
            value={formatEur(stats.averages.marketValueEur)}
            communityLabel={`Community avg ${formatEur(communityAvgValue)}`}
          />
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Local StatCard wrapper: design-system Card + handoff §6 card-header pattern
   (cond 13px ink, hairline divider underneath, 8px gap to body content).
   Mirrors the one in app/community/page.tsx — kept inline rather than promoted
   because the community surfaces are the only callers.
   ----------------------------------------------------------------------------- */
function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section">
      <h2 className="cond border-b border-line pb-2 text-[13px] text-ink">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

function AverageCard({
  title,
  value,
  communityLabel,
}: {
  title: string;
  value: string;
  communityLabel: string;
}) {
  return (
    <Card as="section">
      <h2 className="cond border-b border-line pb-2 text-[13px] text-ink">{title}</h2>
      <div className="flex flex-col items-start text-left">
        <span className="mono text-[28px] font-bold text-ink">{value}</span>
        <span className="cond text-[16px] text-ink-3">{communityLabel}</span>
      </div>
    </Card>
  );
}
