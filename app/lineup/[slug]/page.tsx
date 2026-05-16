import Link from "next/link";
import { notFound } from "next/navigation";
import { sql, inArray } from "drizzle-orm";
import { BuildPitch } from "@/components/build-pitch";
import { OwnerLineupActions } from "@/components/owner-lineup-actions";
import { BadgePill, DeviationTagsRow } from "@/components/community/recent-submission-card";
import {
  BADGE_DEFINITIONS,
  categorize as categorizeSubmission,
  deviationTags,
} from "@/components/community/recent-submission-tags";
import { SquadAgeBar } from "@/components/squad-age-bar";
import { SquadCapsBar } from "@/components/squad-caps-bar";
import { SquadValueBar } from "@/components/squad-value-bar";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { formations, players, submissions, teams } from "@/lib/db/schema";
import {
  getCountrySquadStats,
  getPickRatesForTeam,
  getTopFormationNameForTeam,
} from "@/lib/db/queries";
import { readFingerprint } from "@/lib/fingerprint";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/db/schema";
import type { FormationDef } from "@/lib/formations";

export const dynamic = "force-dynamic";

const MIN_SUBMISSIONS_FOR_TAGS = 5;

type PickCategory = "conventional" | "debated" | "bold";

function categorize(rate: number): PickCategory {
  if (rate >= 0.6) return "conventional";
  if (rate <= 0.15) return "bold";
  return "debated";
}

type Params = { slug: string };

export default async function LineupPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const submissionRow = (
    await db.select().from(submissions).where(sql`${submissions.publicSlug} = ${slug}`).limit(1)
  )[0];
  if (!submissionRow) notFound();

  const formationRow = (
    await db
      .select()
      .from(formations)
      .where(sql`${formations.id} = ${submissionRow.formationId}`)
      .limit(1)
  )[0];
  if (!formationRow) notFound();

  const teamRow = (
    await db.select().from(teams).where(sql`${teams.id} = ${submissionRow.teamId}`).limit(1)
  )[0];
  if (!teamRow) notFound();

  const allIds = [...submissionRow.starters, ...submissionRow.bench];
  const playerRows = allIds.length
    ? await db.select().from(players).where(inArray(players.id, allIds))
    : [];
  const byId = new Map(playerRows.map((p) => [p.id, p] as const));

  const startersResolved: (Player | null)[] = submissionRow.starters.map((id) => byId.get(id) ?? null);
  const benchResolved: (Player | null)[] = submissionRow.bench.map((id) => byId.get(id) ?? null);

  const formation: FormationDef = { name: formationRow.name, slots: formationRow.slots };

  const [pickRates, teamTopFormation, fingerprint, countryStats] = await Promise.all([
    getPickRatesForTeam(teamRow.id),
    getTopFormationNameForTeam(teamRow.id),
    readFingerprint(),
    getCountrySquadStats(),
  ]);
  const isOwner = Boolean(fingerprint && fingerprint === submissionRow.fingerprint);

  const allPlayers = [...startersResolved, ...benchResolved].filter(
    (p): p is Player => Boolean(p),
  );
  const squadCount = allPlayers.length;
  const avgAge =
    squadCount > 0 ? allPlayers.reduce((s, p) => s + p.age, 0) / squadCount : null;
  const youngestAge =
    squadCount > 0 ? Math.min(...allPlayers.map((p) => p.age)) : null;
  const oldestAge =
    squadCount > 0 ? Math.max(...allPlayers.map((p) => p.age)) : null;
  const countryStat = countryStats.find((c) => c.code === teamRow.code) ?? null;
  const countryAvgAge = countryStat?.avgAge ?? null;
  const totalCountryPicks = countryStats.reduce((sum, c) => sum + c.pickCount, 0);
  const globalAvgAge =
    totalCountryPicks > 0
      ? countryStats.reduce((sum, c) => sum + c.avgAge * c.pickCount, 0) /
        totalCountryPicks
      : null;
  const avgValue =
    squadCount > 0
      ? allPlayers.reduce((s, p) => s + p.marketValueEur, 0) / squadCount
      : null;
  const minSquadValue =
    squadCount > 0
      ? Math.min(...allPlayers.map((p) => p.marketValueEur))
      : null;
  const maxSquadValue =
    squadCount > 0
      ? Math.max(...allPlayers.map((p) => p.marketValueEur))
      : null;
  const countryAvgValue = countryStat?.avgMarketValueEur ?? null;
  const globalAvgValue =
    totalCountryPicks > 0
      ? countryStats.reduce(
          (sum, c) => sum + c.avgMarketValueEur * c.pickCount,
          0,
        ) / totalCountryPicks
      : null;
  const playersWithCaps = allPlayers.filter((p) => p.internationalCaps != null);
  const avgCaps =
    playersWithCaps.length > 0
      ? Math.round(
          playersWithCaps.reduce((s, p) => s + (p.internationalCaps ?? 0), 0) /
            playersWithCaps.length,
        )
      : null;
  const countryAvgCaps = countryStat?.avgInternationalCaps ?? null;
  const globalAvgCaps =
    totalCountryPicks > 0
      ? countryStats.reduce(
          (sum, c) => sum + c.avgInternationalCaps * c.pickCount,
          0,
        ) / totalCountryPicks
      : null;

  const tagsEnabled = pickRates.totalSubmissions >= MIN_SUBMISSIONS_FOR_TAGS;

  function rateFor(playerId: number): number {
    if (pickRates.totalSubmissions === 0) return 0;
    return (pickRates.picksByPlayerId.get(playerId) ?? 0) / pickRates.totalSubmissions;
  }

  const pickCategories = allPlayers.map((p) => ({
    player: p,
    rate: rateFor(p.id),
    category: categorize(rateFor(p.id)),
  }));
  const conventionalCount = pickCategories.filter((p) => p.category === "conventional").length;
  const debatedCount = pickCategories.filter((p) => p.category === "debated").length;
  const boldCount = pickCategories.filter((p) => p.category === "bold").length;
  const totalTagged = pickCategories.length;
  const playerCategoryMap = tagsEnabled
    ? new Map<number, PickCategory>(pickCategories.map((p) => [p.player.id, p.category]))
    : undefined;
  const sortedByRate = tagsEnabled ? [...pickCategories].sort((a, b) => a.rate - b.rate) : [];
  const boldestPick = sortedByRate[0] ?? null;
  const mostConventionalCandidate = sortedByRate[sortedByRate.length - 1] ?? null;
  const mostConventionalPick =
    mostConventionalCandidate && mostConventionalCandidate.player.id !== boldestPick?.player.id
      ? mostConventionalCandidate
      : null;

  const starterPlayers = startersResolved.filter((p): p is Player => Boolean(p));
  const benchPlayers = benchResolved.filter((p): p is Player => Boolean(p));
  const teamPickRateMap = new Map(
    [...pickRates.picksByPlayerId].map(([id, count]) => [
      id,
      pickRates.totalSubmissions > 0 ? count / pickRates.totalSubmissions : 0,
    ]),
  );
  const submissionBadge = categorizeSubmission({
    starters: starterPlayers,
    formation: { name: formation.name },
    teamTopFormation,
    teamTotalSubmissions: pickRates.totalSubmissions,
    teamPickRates: teamPickRateMap,
  }).badge;

  // Hydrate top-20 popular players for this team so `deviationTags` can match
  // bold starters against missing fan-favorite alternatives at the same broad
  // position. Mirrors POPULAR_PLAYERS_PER_TEAM in getRecentSubmissions.
  const POPULAR_PLAYERS_LIMIT = 20;
  const popularIds = [...pickRates.picksByPlayerId.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, POPULAR_PLAYERS_LIMIT)
    .map(([id]) => id);
  const missingPopularIds = popularIds.filter((id) => !byId.has(id));
  const extraPopularRows = missingPopularIds.length
    ? await db.select().from(players).where(inArray(players.id, missingPopularIds))
    : [];
  const popularPlayerById = new Map<number, Player>(byId);
  for (const p of extraPopularRows) popularPlayerById.set(p.id, p);
  const teamPopularPlayers = popularIds
    .map((id) => popularPlayerById.get(id))
    .filter((p): p is Player => Boolean(p));

  const tags = deviationTags({
    starters: starterPlayers,
    bench: benchPlayers,
    formation: { name: formation.name },
    teamTopFormation,
    teamTotalSubmissions: pickRates.totalSubmissions,
    teamPickRates: teamPickRateMap,
    teamPopularPlayers,
  });

  const pageTitle = `${isOwner ? "Your" : "One fan's"} ${teamRow.name} 2026`;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] md:gap-12">
      <div className="space-y-4 md:space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="display text-[44px] text-ink leading-[0.95] [text-wrap:balance] sm:text-[52px]">
            {pageTitle}
          </h1>
        </header>

        {isOwner && (
          <div className="min-[411px]:hidden">
            <OwnerLineupActions
              slug={slug}
              teamCode={teamRow.code}
              team={{ name: teamRow.name, flagEmoji: teamRow.flagEmoji }}
              formation={formation}
              starters={starterPlayers}
              bench={benchPlayers}
              category={{ badge: submissionBadge }}
            />
          </div>
        )}

        <Card padding="default" className="gap-3">
          <div className="flex items-center gap-3">
            <BadgePill badge={submissionBadge} />
            <p className="text-[12px] leading-snug text-ink-2">
              {BADGE_DEFINITIONS[submissionBadge]}
            </p>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <h3 className="cond text-[12px] tracking-[0.14em] text-accent">
                Your key changes
              </h3>
              <DeviationTagsRow tags={tags} />
            </div>
          )}
        </Card>

        <div className="mx-auto -mt-2 w-[90%] md:-mt-4">
          <BuildPitch
            formation={formation}
            starters={startersResolved}
            bench={benchResolved}
            showPhotos
            showPlayerDetails
            useFirstInitial
            playerCategories={playerCategoryMap}
          />
        </div>
      </div>

      <div className="space-y-3">
          {isOwner && (
            <div className="max-[410px]:hidden">
              <OwnerLineupActions
                slug={slug}
                teamCode={teamRow.code}
                team={{ name: teamRow.name, flagEmoji: teamRow.flagEmoji }}
                formation={formation}
                starters={starterPlayers}
                bench={benchPlayers}
                category={{ badge: submissionBadge }}
              />
            </div>
          )}

          {/* VS. The Crowd */}
          {tagsEnabled && (
            <Card padding="default" className="gap-3">
              <div className="border-b border-line pb-2">
                <h2 className="cond text-[13px] text-ink">VS. The Crowd</h2>
              </div>

              <ConsensusBar
                consensus={conventionalCount}
                debated={debatedCount}
                bold={boldCount}
                total={totalTagged}
              />

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mono text-[11px] tracking-[0.08em] text-ink-3">
                <LegendChip color="success" label={`${conventionalCount} consensus`} />
                <LegendChip color="gold" label={`${debatedCount} debated`} />
                <LegendChip color="accent" label={`${boldCount} bold`} />
              </div>

              {(boldestPick || mostConventionalPick) && (
                <div className="mt-1 border-t border-line" />
              )}
              {mostConventionalPick && (
                <>
                  <p className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
                    Your Safest Pick
                  </p>
                  <PickHighlightCard pick={mostConventionalPick} tone="conventional" />
                </>
              )}
              {boldestPick && (
                <>
                  <p className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
                    Your Boldest Call
                  </p>
                  <PickHighlightCard pick={boldestPick} tone="bold" />
                </>
              )}
            </Card>
          )}

          {youngestAge != null && oldestAge != null && oldestAge > youngestAge && (
            <SquadAgeBar
              countryAge={countryAvgAge}
              countryEmoji={teamRow.flagEmoji}
              countryCode={teamRow.code}
              globalAvgAge={globalAvgAge}
              userAge={avgAge}
            />
          )}

          {avgCaps != null && (
            <SquadCapsBar
              countryCaps={countryAvgCaps}
              countryEmoji={teamRow.flagEmoji}
              countryCode={teamRow.code}
              globalCaps={globalAvgCaps}
              userCaps={avgCaps}
            />
          )}

          {minSquadValue != null &&
            maxSquadValue != null &&
            maxSquadValue > minSquadValue && (
              <SquadValueBar
                countryValue={countryAvgValue}
                countryEmoji={teamRow.flagEmoji}
                countryCode={teamRow.code}
                globalValue={globalAvgValue}
                userValue={avgValue}
              />
            )}

          <Link
            href="/countries"
            className={cn(
              "inline-flex h-12 w-full items-center justify-center rounded-pill",
              "bg-blue-600 text-white shadow-2",
              "font-condensed font-extrabold uppercase tracking-[0.1em] text-[14px]",
              "transition-[background-color,box-shadow,transform] duration-150 ease-in-out",
              "hover:-translate-y-px hover:bg-blue-700 hover:shadow-3",
              "active:translate-y-0 active:bg-blue-800 active:shadow-1",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-300",
            )}
          >
            Create New Team
          </Link>
        </div>
      </div>
  );
}

function ConsensusBar({
  consensus,
  debated,
  bold,
  total,
}: {
  consensus: number;
  debated: number;
  bold: number;
  total: number;
}) {
  if (total <= 0) {
    return <div className="h-2 w-full rounded-pill bg-bg-sunk" />;
  }
  const segments = [
    { color: "bg-success", count: consensus },
    { color: "bg-gold", count: debated },
    { color: "bg-accent", count: bold },
  ];
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-pill bg-bg-sunk"
      role="img"
      aria-label={`${consensus} consensus, ${debated} debated, ${bold} bold of ${total} picks`}
    >
      {segments.map((s, i) =>
        s.count > 0 ? (
          <span
            key={i}
            className={cn("h-full min-w-[4px]", s.color)}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

function LegendChip({
  color,
  label,
}: {
  color: "success" | "gold" | "accent";
  label: string;
}) {
  const dot =
    color === "success" ? "bg-success" : color === "gold" ? "bg-gold" : "bg-accent";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

function PickHighlightCard({
  pick,
  tone,
}: {
  pick: { player: Player; rate: number };
  tone: "bold" | "conventional";
}) {
  const { player, rate } = pick;
  const initial = player.fullName.split(" ")[0]?.[0] ?? "?";
  const rateColor = tone === "bold" ? "text-accent" : "text-success";

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 text-[13px] font-semibold text-ink-3">
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photoUrl}
            alt={player.fullName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          initial
        )}
        {player.jerseyNumber != null && (
          <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-ink mono text-[9px] font-bold text-bg-elev">
            {player.jerseyNumber}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{player.fullName}</p>
        <p className="truncate mono text-[11px] tracking-[0.02em] text-ink-3">
          {player.detailedPosition} · {player.age}y · Int&rsquo;l Caps: {player.internationalCaps ?? "—"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("mono text-[14px] font-bold", rateColor)}>
          {Math.round(rate * 100)}%
        </p>
        <p className="mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">picked</p>
      </div>
    </div>
  );
}
