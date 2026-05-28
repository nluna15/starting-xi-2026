import Link from "next/link";
import { notFound } from "next/navigation";
import { LineupBuilder } from "@/components/lineup-builder";
import { Button } from "@/components/ui/button";
import { getPlayersForTeam, getTeamByCode } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type Params = { teamCode: string };

export default async function BuildPage({ params }: { params: Promise<Params> }) {
  const { teamCode } = await params;
  const team = await getTeamByCode(teamCode.toUpperCase());
  if (!team) notFound();

  const pool = await getPlayersForTeam(team.id);

  if (pool.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          {team.flagEmoji}
        </span>
        <h1 className="display text-[44px] text-ink">{team.name} roster coming soon</h1>
        <p className="max-w-md text-[14px] text-ink-3">
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
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-end justify-between gap-3 border-b border-line pb-2">
        <div className="flex items-center gap-3">
          <span className="text-6xl leading-none sm:text-7xl" aria-hidden>
            {team.flagEmoji}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="display text-[44px] text-ink leading-[0.95] sm:text-[48px]">
              {team.name}
            </h1>
          </div>
        </div>
      </div>
      <LineupBuilder players={pool} teamCode={team.code} />
    </div>
  );
}
