import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat";
import { BuildPitch } from "@/components/build-pitch";
import { getCrowdStats, getTeamByCode } from "@/lib/db/queries";
import { formatAge, formatEur } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Params = { teamCode: string };

export default async function CrowdPage({ params }: { params: Promise<Params> }) {
  const { teamCode } = await params;
  const code = teamCode.toUpperCase();
  const team = await getTeamByCode(code);
  if (!team) notFound();

  const stats = await getCrowdStats(code);

  if (stats.totalSubmissions === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="text-5xl leading-none" aria-hidden>
          {team.flagEmoji}
        </span>
        <h1 className="display text-[40px] text-ink sm:text-[48px] [text-wrap:balance]">
          No {team.name} submissions yet
        </h1>
        <p className="max-w-md text-[14px] leading-[1.45] text-ink-3">
          Be the first to submit a {team.name} lineup and the crowd page will start to fill in.
        </p>
        <Link href={`/${team.code}/build`}>
          <Button size="lg">Build the {team.name} XI</Button>
        </Link>
      </div>
    );
  }

  const slots = stats.mostLikelyXi.slots;
  const startersResolved = slots.map((s) => s.player);

  const formationDef = stats.mostLikelyXi.formation
    ? { name: stats.mostLikelyXi.formation.name, slots: stats.mostLikelyXi.formation.slots }
    : null;

  const submissionsLabel = `${stats.totalSubmissions} submission${
    stats.totalSubmissions === 1 ? "" : "s"
  }`;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <span className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
          Wisdom of the crowd · {team.flagEmoji} {team.name}
        </span>
        <h1 className="display text-[44px] text-ink leading-[0.95] [text-wrap:balance] sm:text-[52px]">
          The crowd&rsquo;s most-likely XI
        </h1>
        <p className="max-w-2xl text-[14px] leading-[1.45] text-ink-3">
          Based on {submissionsLabel}. Each slot shows the player picked most often, with the pick
          rate among submissions using this formation.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {formationDef && (
          <div className="mx-auto w-[90%] max-w-[420px] pb-10 lg:max-w-[560px]">
            <BuildPitch
              formation={formationDef}
              starters={startersResolved}
              showPhotos
            />
          </div>
        )}
        <div className="space-y-3">
          <Card padding="default" className="gap-3">
            <h2 className="cond text-[13px] text-ink border-b border-line pb-2">
              Most-popular formation
            </h2>
            <div className="display text-[34px] text-ink leading-[0.95]">
              {stats.topFormation?.name ?? "—"}
            </div>
            <ul className="flex flex-col gap-1.5 text-[13px]">
              {stats.formationCounts.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between gap-3 text-ink-3"
                >
                  <span className="cond text-[12px] text-ink-2">{f.name}</span>
                  <span className="mono text-[12px] text-ink-2">
                    {f.count} ({Math.round((f.count / stats.totalSubmissions) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="default" className="gap-3">
            <h2 className="cond text-[13px] text-ink border-b border-line pb-2">
              Squad averages
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Avg age" value={formatAge(stats.averages.age)} size="md" />
              <StatTile
                label="Avg market value"
                value={formatEur(stats.averages.marketValueEur)}
                size="md"
              />
            </div>
          </Card>

          <Card padding="default" className="gap-3">
            <h2 className="cond text-[13px] text-ink border-b border-line pb-2">
              Most-important subs
            </h2>
            {stats.topBench.length === 0 ? (
              <p className="text-[13px] text-ink-faint">No bench data yet.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {stats.topBench.map((b, i) => (
                  <li
                    key={b.player.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="mono text-[12px] tabular-nums text-ink-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-[13px] font-semibold text-ink">
                        {b.player.fullName}
                      </span>
                      <span className="mono text-[11px] tracking-[0.08em] text-ink-3">
                        {b.player.detailedPosition}
                      </span>
                    </span>
                    <span className="mono text-[12px] text-ink-2">
                      {Math.round(b.rate * 100)}%
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <div className="flex justify-center">
        <Link href={`/${team.code}/build`}>
          <Button size="lg">Submit your own {team.name} XI</Button>
        </Link>
      </div>
    </div>
  );
}
