import Link from "next/link";
import { inArray, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommunityCountryCarousel } from "@/components/community/country-carousel";
import { CommunityPitch } from "@/components/community-pitch";
import { CommunitySubmittedModal } from "@/components/community-submitted-modal";
import { HorizontalBarChart, type BarRow } from "@/components/horizontal-bar-chart";
import { db } from "@/lib/db/client";
import { players, submissions, teams, type Player } from "@/lib/db/schema";
import {
  getCountrySquadStats,
  getGlobalCrowdStats,
  getPickRatesForTeam,
  getRosterStatusByCode,
} from "@/lib/db/queries";
import { FIFA_TO_ISO2, WC_2026_SLOTS } from "@/lib/wc-2026-teams";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type SearchParams = Promise<{ submitted?: string | string[] }>;

async function loadSubmittedContext(slug: string) {
  const submissionRow = (
    await db.select().from(submissions).where(sql`${submissions.publicSlug} = ${slug}`).limit(1)
  )[0];
  if (!submissionRow) return null;

  const teamRow = (
    await db.select().from(teams).where(sql`${teams.id} = ${submissionRow.teamId}`).limit(1)
  )[0];
  if (!teamRow) return null;

  const allIds = [...submissionRow.starters, ...submissionRow.bench];
  const playerRows = allIds.length
    ? await db.select().from(players).where(inArray(players.id, allIds))
    : [];
  const byId = new Map(playerRows.map((p) => [p.id, p] as const));

  const starters = submissionRow.starters
    .map((id) => byId.get(id) ?? null)
    .filter((p): p is Player => Boolean(p));
  const bench = submissionRow.bench
    .map((id) => byId.get(id) ?? null)
    .filter((p): p is Player => Boolean(p));

  const pickRates = await getPickRatesForTeam(teamRow.id);

  return {
    team: { name: teamRow.name, flagEmoji: teamRow.flagEmoji },
    teamCode: teamRow.code,
    starters,
    bench,
    pickRates,
  };
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { submitted } = await searchParams;
  const submittedSlug = Array.isArray(submitted) ? submitted[0] : submitted;
  const submittedContext = submittedSlug ? await loadSubmittedContext(submittedSlug) : null;

  const [stats, countryStats, statusByCode] = await Promise.all([
    getGlobalCrowdStats(),
    getCountrySquadStats(),
    getRosterStatusByCode(),
  ]);

  const readyCodes = WC_2026_SLOTS.flatMap((s) =>
    s.kind === "confirmed" && statusByCode.get(s.code) === "ready" ? [s.code] : [],
  );

  const ageRows: BarRow[] = [...countryStats]
    .sort((a, b) => b.avgAge - a.avgAge)
    .map((c) => ({
      key: c.code,
      label: c.code,
      flagEmoji: c.flagEmoji,
      value: c.avgAge,
    }));

  const valueRows: BarRow[] = [...countryStats]
    .sort((a, b) => b.avgMarketValueEur - a.avgMarketValueEur)
    .map((c) => ({
      key: c.code,
      label: c.code,
      flagEmoji: c.flagEmoji,
      value: c.avgMarketValueEur,
    }));

  if (stats.totalSubmissions === 0) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            🏆
          </span>
          <h1 className="text-2xl font-bold">No submissions yet</h1>
          <p className="max-w-md text-sm text-zinc-400">
            Be the first to submit a lineup and the community page will start to fill in.
          </p>
          <Link href="/countries">
            <Button>Pick a country</Button>
          </Link>
        </div>
        {submittedContext && <CommunitySubmittedModal {...submittedContext} />}
      </>
    );
  }

  const slots = stats.mostLikelyXi.slots;
  const startersResolved = slots.map((s) =>
    s.player
      ? {
          id: s.player.id,
          fullName: s.player.fullName,
          photoUrl: s.player.photoUrl,
          countryCode: s.teamCode ? FIFA_TO_ISO2[s.teamCode] ?? null : null,
          age: s.player.age,
          marketValueEur: s.player.marketValueEur,
          club: s.player.club,
        }
      : null,
  );

  const formationDef = stats.mostLikelyXi.formation
    ? { name: stats.mostLikelyXi.formation.name, slots: stats.mostLikelyXi.formation.slots }
    : null;

  return (
    <div className="space-y-8">
      <CommunityCountryCarousel
        slots={WC_2026_SLOTS}
        readyCodes={readyCodes}
        linkMode="community"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Global Fan&rsquo;s Best 11
          </h1>
        </div>
        <Link href="/countries" className="sm:shrink-0">
          <Button size="lg">Submit your own XI</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {formationDef && (
          <div className="mx-auto w-[81%] max-w-[420px] pb-10 lg:max-w-[560px]">
            <CommunityPitch
              formation={formationDef}
              starters={startersResolved}
              showPhotos
            />
          </div>
        )}
        <div className="space-y-4">
          <Card
            title="Most-popular formation"
            className="text-white"
            titleClassName="text-[21px] text-white"
            borderless
          >
            <div className="text-2xl font-bold">{stats.topFormation?.name ?? "—"}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {stats.formationCounts.map((f) => (
                <li key={f.name} className="flex items-center justify-between">
                  <span>{f.name}</span>
                  <span>
                    {f.count} ({Math.round((f.count / stats.totalSubmissions) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Most-picked players" titleClassName="text-white" borderless>
            <ol className="space-y-2 text-sm text-white">
              {stats.topPlayers.length === 0 && (
                <li>No data yet.</li>
              )}
              {stats.topPlayers.map((b, i) => (
                <li key={b.player.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span>{i + 1}.</span>
                    <span className="font-medium">{b.player.fullName}</span>
                    <span className="text-xs">{b.player.detailedPosition},</span>
                    {b.teamCode && <span className="text-xs text-white/80">{b.teamCode}</span>}
                  </span>
                  <span className="text-xs">{Math.round(b.rate * 100)}%</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Average squad age" titleClassName="text-white" borderless>
          <HorizontalBarChart
            rows={ageRows}
            formatValue={(v) => v.toFixed(1)}
          />
        </Card>
        <Card title="Average market value per player" titleClassName="text-white" borderless>
          <HorizontalBarChart
            rows={valueRows}
            formatValue={formatEurCompact}
          />
        </Card>
        <Card title="Coming soon" titleClassName="text-white" borderless>
          <div className="flex h-full min-h-48 items-center justify-center text-xs text-zinc-300">
            Placeholder — metric TBD
          </div>
        </Card>
      </div>
      {submittedContext && <CommunitySubmittedModal {...submittedContext} />}
    </div>
  );
}

function formatEurCompact(eur: number): string {
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (eur >= 1_000) return `€${(eur / 1_000).toFixed(0)}K`;
  return `€${Math.round(eur)}`;
}

function Card({
  title,
  children,
  className = "",
  titleClassName = "text-zinc-300",
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
      <h2 className={cn("mb-2 text-sm font-semibold", titleClassName)}>{title}</h2>
      {children}
    </section>
  );
}
