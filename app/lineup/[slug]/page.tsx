import Link from "next/link";
import { notFound } from "next/navigation";
import { sql, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { FormationPitch } from "@/components/formation-pitch";
import { LineupSubmittedOverlay } from "@/components/lineup-submitted-overlay";
import { NoteForm } from "@/components/note-form";
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

const CATEGORY_STYLES: Record<PickCategory, { label: string; className: string }> = {
  conventional: {
    label: "Conventional",
    className: "border-emerald-300 bg-emerald-100 text-emerald-800",
  },
  debated: {
    label: "Debated",
    className: "border-amber-300 bg-amber-100 text-amber-800",
  },
  bold: {
    label: "Bold",
    className: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800",
  },
};

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
        <Link href={`/${teamRow.code}/build`}>
          <Button variant="outline" size="md">
            Build your own
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <FormationPitch
            formation={formation}
            starters={startersResolved}
            readOnly
            showPhotos
          />
          <div className="flex items-center justify-center gap-6 pt-2">
            {benchResolved.map((p, i) => (
              <BenchCircle key={i} player={p} index={i} />
            ))}
          </div>
          <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
            Formation {formation.name}
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Average Age" value={formatAge(avgAge)} />
            <StatTile label="Team Market Value" value={formatEur(totalValue)} />
            <StatTile label="International Caps" value="—" />
            <StatTile
              label="Fans for this team"
              value={pickRates.totalSubmissions.toLocaleString()}
            />
          </div>

          {isOwner ? (
            <NoteForm slug={slug} initialNote={submissionRow.note ?? null} />
          ) : submissionRow.note ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Their reasoning</h3>
              <blockquote className="rounded-lg border border-border bg-surface px-3 py-2 text-sm italic text-foreground">
                {submissionRow.note}
              </blockquote>
            </div>
          ) : null}

          {isOwner && (
            <LineupSubmittedOverlay
              slug={slug}
              team={{ name: teamRow.name, flagEmoji: teamRow.flagEmoji }}
              teamCode={teamRow.code}
              starters={startersResolved.filter((p): p is Player => Boolean(p))}
              bench={benchResolved.filter((p): p is Player => Boolean(p))}
              pickRates={pickRates}
            />
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">How your picks compare</h3>
        {tagsEnabled ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {startersResolved.map((p, i) => (
              <PickRow
                key={`s-${i}`}
                player={p}
                slotLabel={formation.slots[i]?.slot ?? `Slot ${i + 1}`}
                rate={p ? rateFor(p.id) : 0}
                hasData={Boolean(p)}
              />
            ))}
            {benchResolved.map((p, i) => (
              <PickRow
                key={`b-${i}`}
                player={p}
                slotLabel={`Bench ${i + 1}`}
                rate={p ? rateFor(p.id) : 0}
                hasData={Boolean(p)}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-4 text-xs text-muted">
            Need at least {MIN_SUBMISSIONS_FOR_TAGS} {teamRow.name} lineups before we can label
            picks. Currently at {pickRates.totalSubmissions}. Share the link to get more fans
            in.
          </p>
        )}
      </section>

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

function BenchCircle({ player, index }: { player: Player | null; index: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-sm",
            player
              ? "border-foreground/20 bg-surface text-foreground"
              : "border-dashed border-border-strong bg-surface-muted text-muted",
          )}
        >
          {player?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.photoUrl}
              alt={player.fullName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : player ? (
            getInitials(player.fullName)
          ) : (
            "—"
          )}
        </div>
        {player?.jerseyNumber != null && (
          <span className="pointer-events-none absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-bold leading-none text-foreground shadow-sm">
            {player.jerseyNumber}
          </span>
        )}
        <span className="pointer-events-none absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold leading-none text-accent-foreground shadow-sm">
          {index + 1}
        </span>
      </div>
      <span
        className={cn(
          "max-w-[80px] truncate text-[11px] font-semibold uppercase tracking-wide",
          player ? "text-foreground" : "text-muted",
        )}
      >
        {player ? getLastName(player.fullName) : `Sub ${index + 1}`}
      </span>
    </div>
  );
}

function PickRow({
  player,
  slotLabel,
  rate,
  hasData,
}: {
  player: Player | null;
  slotLabel: string;
  rate: number;
  hasData: boolean;
}) {
  const category = hasData ? categorize(rate) : null;
  const style = category ? CATEGORY_STYLES[category] : null;
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {player?.fullName ?? "—"}
        </div>
        <div className="truncate text-[11px] text-muted">
          {slotLabel}
          {player ? ` · ${player.detailedPosition}` : ""}
          {hasData ? ` · ${Math.round(rate * 100)}% pick rate` : ""}
        </div>
      </div>
      {style && (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            style.className,
          )}
        >
          {style.label}
        </span>
      )}
    </li>
  );
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getLastName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}
