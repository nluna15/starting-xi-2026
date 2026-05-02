import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormationPitch } from "@/components/formation-pitch";
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
        <span className="text-4xl" aria-hidden>
          {team.flagEmoji}
        </span>
        <h1 className="text-2xl font-bold">No {team.name} submissions yet</h1>
        <p className="max-w-md text-sm text-zinc-400">
          Be the first to submit a {team.name} lineup and the crowd page will start to fill in.
        </p>
        <Link href={`/${team.code}/build`}>
          <Button>Build the {team.name} XI</Button>
        </Link>
      </div>
    );
  }

  const slots = stats.mostLikelyXi.slots;
  const startersResolved = slots.map((s) => s.player);
  const pickRates = slots.map((s) => s.pickRate);

  const formationDef = stats.mostLikelyXi.formation
    ? { name: stats.mostLikelyXi.formation.name, slots: stats.mostLikelyXi.formation.slots }
    : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
          Wisdom of the crowd · {team.flagEmoji} {team.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          The crowd&rsquo;s most-likely XI
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Based on {stats.totalSubmissions} submission{stats.totalSubmissions === 1 ? "" : "s"}.
          Each slot shows the player picked most often, with the pick rate among submissions using
          this formation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {formationDef && (
          <FormationPitch
            formation={formationDef}
            starters={startersResolved}
            readOnly
            pickRates={pickRates}
            showPhotos={code === "USA"}
          />
        )}
        <div className="space-y-4">
          <Card title="Most-popular formation">
            <div className="text-2xl font-bold">{stats.topFormation?.name ?? "—"}</div>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              {stats.formationCounts.map((f) => (
                <li key={f.name} className="flex items-center justify-between">
                  <span>{f.name}</span>
                  <span className="text-zinc-300">
                    {f.count} ({Math.round((f.count / stats.totalSubmissions) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Squad averages">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Avg age" value={formatAge(stats.averages.age)} />
              <Stat label="Avg market value" value={formatEur(stats.averages.marketValueEur)} />
            </div>
          </Card>

          <Card title="Most-important subs">
            <ol className="space-y-2 text-sm">
              {stats.topBench.length === 0 && (
                <li className="text-zinc-500">No bench data yet.</li>
              )}
              {stats.topBench.map((b, i) => (
                <li key={b.player.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="text-zinc-500">{i + 1}.</span>
                    <span className="font-medium text-zinc-100">{b.player.fullName}</span>
                    <span className="text-xs text-zinc-500">{b.player.detailedPosition}</span>
                  </span>
                  <span className="text-xs text-zinc-400">
                    {Math.round(b.rate * 100)}%
                  </span>
                </li>
              ))}
            </ol>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="mb-2 text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-base font-semibold text-zinc-100">{value}</div>
    </div>
  );
}
