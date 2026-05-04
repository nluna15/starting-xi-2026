import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CommunityCountryCarousel } from "@/components/community/country-carousel";
import { CommunityPitch } from "@/components/community-pitch";
import {
  getCountrySquadStats,
  getCrowdStats,
  getRosterStatusByCode,
} from "@/lib/db/queries";
import { cn, formatAge, formatEur } from "@/lib/utils";
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
          <h1 className="text-2xl font-bold">
            No submissions yet for {team.name}
          </h1>
          <p className="max-w-md text-sm text-zinc-400">
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
    <div className="space-y-8">
      <CommunityCountryCarousel
        slots={WC_2026_SLOTS}
        readyCodes={readyCodes}
        linkMode="community"
        activeCode={team.code}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            <span aria-hidden>{team.flagEmoji}</span> {team.code}
            {stats.topFormation ? ` · ${stats.topFormation.name}` : ""}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {team.name}&rsquo;s Best 11
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            From {stats.totalSubmissions.toLocaleString()}{" "}
            {stats.totalSubmissions === 1 ? "submission" : "submissions"}
          </p>
        </div>
        <Link href={submitHref} className="sm:shrink-0">
          <Button size="lg">{submitLabel}</Button>
        </Link>
      </div>

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

        <div className="space-y-4">
          <Card title="Most-popular formation" borderless>
            <div className="text-2xl font-bold">
              {stats.topFormation?.name ?? "—"}
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {stats.formationCounts.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between"
                >
                  <span>{f.name}</span>
                  <span>
                    {f.count} (
                    {Math.round((f.count / stats.totalSubmissions) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Most-popular players" borderless>
            <ol className="space-y-2 text-sm text-white">
              {stats.topPlayers.length === 0 && <li>No data yet.</li>}
              {stats.topPlayers.map((b, i) => (
                <li
                  key={b.player.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <span>{i + 1}.</span>
                    <span className="font-medium">{b.player.fullName}</span>
                    <span className="text-xs">{b.player.detailedPosition}</span>
                  </span>
                  <span className="text-xs">{Math.round(b.rate * 100)}%</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Average squad age" borderless>
          <div className="text-3xl font-bold">{formatAge(stats.averages.age)}</div>
          <div className="mt-1 text-xs text-zinc-300">
            Community avg: {formatAge(communityAvgAge)}
          </div>
        </Card>
        <Card title="Average market value per player" borderless>
          <div className="text-3xl font-bold">
            {formatEur(stats.averages.marketValueEur)}
          </div>
          <div className="mt-1 text-xs text-zinc-300">
            Community avg: {formatEur(communityAvgValue)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
  titleClassName = "text-white",
  borderless = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  borderless?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-[rgba(111,110,108,0.5)] p-4",
        !borderless && "border border-zinc-800",
        className,
      )}
    >
      <h2 className={cn("mb-2 text-sm font-semibold", titleClassName)}>
        {title}
      </h2>
      {children}
    </section>
  );
}
