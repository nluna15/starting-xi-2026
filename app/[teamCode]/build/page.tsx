import Link from "next/link";
import { notFound } from "next/navigation";
import { LineupBuilder } from "@/components/lineup-builder";
import { Button } from "@/components/ui/button";
import { getPlayersForTeam, getSubmissionCountForTeam, getTeamByCode } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type Params = { teamCode: string };

export default async function BuildPage({ params }: { params: Promise<Params> }) {
  const { teamCode } = await params;
  const team = await getTeamByCode(teamCode.toUpperCase());
  if (!team) notFound();

  const [pool, submissionCount] = await Promise.all([
    getPlayersForTeam(team.id),
    getSubmissionCountForTeam(team.id),
  ]);

  if (pool.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          {team.flagEmoji}
        </span>
        <h1 className="text-2xl font-semibold">{team.name} roster coming soon</h1>
        <p className="max-w-md text-sm text-zinc-400">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            {team.flagEmoji} {team.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Build your {team.name} XI
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {pool.length} players in the pool. Pick your formation, fill all 14 slots, then submit.
          </p>
        </div>
        {submissionCount > 0 && (
          <Link
            href={`/${team.code}/crowd`}
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            See the crowd&rsquo;s XI →
          </Link>
        )}
      </div>
      <LineupBuilder players={pool} teamCode={team.code} />
    </div>
  );
}
