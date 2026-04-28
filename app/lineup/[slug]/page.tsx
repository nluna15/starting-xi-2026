import Link from "next/link";
import { notFound } from "next/navigation";
import { sql, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { FormationPitch } from "@/components/formation-pitch";
import { NoteForm } from "@/components/note-form";
import { db } from "@/lib/db/client";
import { formations, players, submissions, teams } from "@/lib/db/schema";
import { getPickRatesForTeam } from "@/lib/db/queries";
import { readFingerprint } from "@/lib/fingerprint";
import { cn, formatEur } from "@/lib/utils";
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
    className: "border-emerald-700/60 bg-emerald-900/40 text-emerald-200",
  },
  debated: {
    label: "Debated",
    className: "border-amber-700/60 bg-amber-900/40 text-amber-200",
  },
  bold: {
    label: "Bold",
    className: "border-fuchsia-700/60 bg-fuchsia-900/40 text-fuchsia-200",
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
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            {teamRow.flagEmoji} {teamRow.name} · {formation.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {isOwner ? "Your" : "One fan's"} {teamRow.name} 2026
          </h1>
        </div>
        <Link href={`/${teamRow.code}/build`}>
          <Button variant="outline" size="md">
            Build your own
          </Button>
        </Link>
      </div>

      <FormationPitch
        formation={formation}
        starters={startersResolved}
        readOnly
        showPhotos={teamRow.code === "USA"}
      />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Bench</h3>
        <ul className="grid grid-cols-3 gap-2">
          {benchResolved.map((p, i) => (
            <li
              key={i}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs"
            >
              <div className="font-semibold text-zinc-100">{p?.fullName ?? "—"}</div>
              <div className="text-zinc-400">
                {p ? `${p.detailedPosition} · ${formatEur(p.marketValueEur)}` : ""}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Squad summary</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Formation" value={formation.name} />
          <Stat
            label="Avg age (14)"
            value={avgAge != null ? avgAge.toFixed(1) : "—"}
          />
          <Stat label="Total value" value={formatEur(totalValue)} />
          <Stat
            label="Fans for this team"
            value={pickRates.totalSubmissions.toLocaleString()}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">How your picks compare</h3>
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
          <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 px-3 py-4 text-xs text-zinc-500">
            Need at least {MIN_SUBMISSIONS_FOR_TAGS} {teamRow.name} lineups before we can label
            picks. Currently at {pickRates.totalSubmissions}. Share the link to get more fans
            in.
          </p>
        )}
      </section>

      <section>
        {isOwner ? (
          <NoteForm slug={slug} initialNote={submissionRow.note ?? null} />
        ) : submissionRow.note ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">Their reasoning</h3>
            <blockquote className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm italic text-zinc-300">
              {submissionRow.note}
            </blockquote>
          </div>
        ) : null}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm font-semibold text-zinc-100">{value}</div>
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
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-100">
          {player?.fullName ?? "—"}
        </div>
        <div className="truncate text-[11px] text-zinc-500">
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
