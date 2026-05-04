import { notFound } from "next/navigation";
import { sql, inArray } from "drizzle-orm";
import { BuildPitch } from "@/components/build-pitch";
import { OwnerLineupActions } from "@/components/owner-lineup-actions";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat";
import { db } from "@/lib/db/client";
import { formations, players, submissions, teams } from "@/lib/db/schema";
import { getPickRatesForTeam } from "@/lib/db/queries";
import { readFingerprint } from "@/lib/fingerprint";
import { cn, formatAge, formatEur } from "@/lib/utils";
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

  const pageTitle = `${isOwner ? "Your" : "One fan's"} ${teamRow.name} 2026`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <span className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
          Global Fan&rsquo;s Best 11 · {teamRow.flagEmoji} {teamRow.name} · {formation.name}
        </span>
        <h1 className="display text-[44px] text-ink leading-[0.95] [text-wrap:balance] sm:text-[52px]">
          {pageTitle}
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="cond text-center text-[12px] tracking-[0.08em] text-ink-2">
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

        <div className="space-y-3 md:mt-7">
          {/* Squad at a Glance */}
          <Card padding="default" className="gap-3">
            <h2 className="cond text-[13px] text-ink border-b border-line pb-2">
              Squad at a Glance
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Avg Age" value={formatAge(avgAge)} size="md" />
              <StatTile label="Value" value={formatEur(totalValue)} size="md" />
              <StatTile label="Caps" value="—" size="md" />
              <StatTile
                label="Fans"
                value={pickRates.totalSubmissions.toLocaleString()}
                size="md"
              />
            </div>
          </Card>

          {/* VS. The Crowd */}
          {tagsEnabled && (
            <Card padding="default" className="gap-3">
              <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                <h2 className="cond text-[13px] text-ink">VS. The Crowd</h2>
                <span className="mono text-[11px] tracking-[0.08em] text-ink-faint">
                  {conventionalCount}/{totalTagged} aligned
                </span>
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

              {boldestPick && (
                <>
                  <div className="mt-1 border-t border-line" />
                  <p className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
                    Your Boldest Call
                  </p>
                  <BoldestPickCard pick={boldestPick} />
                </>
              )}
            </Card>
          )}

          {/* Your Take / note */}
          {isOwner ? (
            <OwnerLineupActions
              slug={slug}
              initialNote={submissionRow.note ?? null}
            />
          ) : submissionRow.note ? (
            <Card padding="default" className="gap-2">
              <h2 className="cond text-[13px] text-ink border-b border-line pb-2">
                Their Reasoning
              </h2>
              <blockquote className="text-[14px] leading-[1.5] text-ink-2 italic">
                {submissionRow.note}
              </blockquote>
            </Card>
          ) : null}
        </div>
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

function BoldestPickCard({
  pick,
}: {
  pick: { player: Player; rate: number };
}) {
  const { player, rate } = pick;
  const initial = player.fullName.split(" ")[0]?.[0] ?? "?";

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
        <p className="truncate mono text-[11px] tracking-[0.08em] text-ink-3">
          {player.detailedPosition} · {player.age}y · {player.club}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="mono text-[14px] font-bold text-accent">
          {Math.round(rate * 100)}%
        </p>
        <p className="mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">picked</p>
      </div>
    </div>
  );
}
