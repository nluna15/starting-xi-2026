import Link from "next/link";
import { notFound } from "next/navigation";
import { sql, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { BuildPitch } from "@/components/build-pitch";
import { OwnerLineupActions } from "@/components/owner-lineup-actions";
import { db } from "@/lib/db/client";
import { formations, players, submissions, teams } from "@/lib/db/schema";
import { getPickRatesForTeam } from "@/lib/db/queries";
import { readFingerprint } from "@/lib/fingerprint";
import { formatAge, formatEur } from "@/lib/utils";
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

  const [pickRates, fingerprint] = await Promise.all([
    getPickRatesForTeam(teamRow.id),
    readFingerprint(),
  ]);
  const isOwner = Boolean(fingerprint && fingerprint === submissionRow.fingerprint);

  const allPlayers = [...startersResolved, ...benchResolved].filter(
    (p): p is Player => Boolean(p),
  );
  const squadCount = allPlayers.length;
  const avgAge =
    squadCount > 0 ? allPlayers.reduce((s, p) => s + p.age, 0) / squadCount : null;
  const totalValue =
    squadCount > 0 ? allPlayers.reduce((s, p) => s + p.marketValueEur, 0) : null;

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
  const boldestPick =
    tagsEnabled && pickCategories.length > 0
      ? [...pickCategories].sort((a, b) => a.rate - b.rate)[0]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {teamRow.flagEmoji} {teamRow.name} · {formation.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isOwner ? "Your" : "One fan's"} {teamRow.name} 2026
          </h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
              Formation {formation.name}
            </p>
            <div className="mx-auto w-[90%]">
              <BuildPitch
                formation={formation}
                starters={startersResolved}
                bench={benchResolved}
                showPhotos
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 md:mt-7">
          {/* Squad at a Glance */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Squad at a Glance
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Avg Age" value={formatAge(avgAge)} />
              <StatTile label="Value" value={formatEur(totalValue)} />
              <StatTile label="Caps" value="—" />
              <StatTile
                label="Fans"
                value={pickRates.totalSubmissions.toLocaleString()}
              />
            </div>
          </div>

          {/* VS. The Crowd */}
          {tagsEnabled && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground">
                  VS. The Crowd
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
                  {conventionalCount}/{totalTagged} Aligned
                </p>
              </div>

              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(conventionalCount / totalTagged) * 100}%` }}
                />
                <div
                  className="bg-amber-400"
                  style={{ width: `${(debatedCount / totalTagged) * 100}%` }}
                />
                <div
                  className="bg-rose-500"
                  style={{ width: `${(boldCount / totalTagged) * 100}%` }}
                />
              </div>

              <div className="mt-2 flex gap-4 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {conventionalCount} consensus
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {debatedCount} debated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {boldCount} bold
                </span>
              </div>

              {boldestPick && (
                <>
                  <div className="my-3 border-t border-border" />
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    Your Boldest Call
                  </p>
                  <BoldestPickCard pick={boldestPick} />
                </>
              )}
            </div>
          )}

          {/* Your Take / note */}
          {isOwner ? (
            <OwnerLineupActions
              slug={slug}
              initialNote={submissionRow.note ?? null}
            />
          ) : submissionRow.note ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Their Reasoning
              </h3>
              <blockquote className="text-sm italic text-foreground">
                {submissionRow.note}
              </blockquote>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <Link href={`/${teamRow.code}/crowd`}>
          <Button variant="ghost" size="sm">
            See the crowd&rsquo;s lineup →
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-4 text-center">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}

function BoldestPickCard({
  pick,
}: {
  pick: { player: Player; rate: number };
}) {
  const { player, rate } = pick;
  const parts = player.fullName.split(" ");
  const lastName = parts.at(-1) ?? player.fullName;
  const abbrev = parts.length > 1 ? `${parts[0][0]}. ${lastName}` : lastName;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photoUrl}
            alt={player.fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-foreground">{parts[0][0]}</span>
        )}
        {player.jerseyNumber != null && (
          <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-surface">
            {player.jerseyNumber}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold uppercase tracking-wide text-foreground">
          {abbrev}
        </p>
        <p className="truncate text-[11px] uppercase tracking-wide text-muted">
          {player.detailedPosition} · Overlooked by the crowd
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-base font-bold text-accent">{Math.round(rate * 100)}%</p>
        <p className="text-[10px] uppercase tracking-wide text-muted">Picked</p>
      </div>
    </div>
  );
}
