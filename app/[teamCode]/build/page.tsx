import Link from "next/link";
import { notFound } from "next/navigation";
import { LineupBuilder } from "@/components/lineup-builder";
import { Button } from "@/components/ui/button";
import { getPickRatesForTeam, getPlayersForTeam, getTeamByCode } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type Params = { teamCode: string };

export default async function BuildPage({ params }: { params: Promise<Params> }) {
  const { teamCode } = await params;
  const team = await getTeamByCode(teamCode.toUpperCase());
  if (!team) notFound();

  const [pool, pickRates] = await Promise.all([
    getPlayersForTeam(team.id),
    getPickRatesForTeam(team.id),
  ]);

  if (pool.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          {team.flagEmoji}
        </span>
        <h1 className="text-2xl font-semibold">{team.name} roster coming soon</h1>
        <p className="max-w-md text-sm text-muted">
          We haven&rsquo;t loaded a player pool for {team.name} yet. Check back later, or pick a
          different country.
        </p>
        <Link href="/">
          <Button variant="outline">Back to country picker</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            {team.flagEmoji}
          </span>
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-wide leading-tight">
              {team.name}
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Building XI
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Step 02 / 03
          </p>
        </div>
      </div>
      <LineupBuilder
        players={pool}
        teamCode={team.code}
        pickCounts={Array.from(pickRates.picksByPlayerId.entries())}
        totalSubmissions={pickRates.totalSubmissions}
      />
    </div>
  );
}
