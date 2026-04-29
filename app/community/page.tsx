import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormationPitch } from "@/components/formation-pitch";
import { getGlobalCrowdStats } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function CommunityPage() {
  const stats = await getGlobalCrowdStats();

  if (stats.totalSubmissions === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          🏆
        </span>
        <h1 className="text-2xl font-bold">No submissions yet</h1>
        <p className="max-w-md text-sm text-zinc-400">
          Be the first to submit a lineup and the community page will start to fill in.
        </p>
        <Link href="/countries">
          <Button>Pick a country</Button>
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
          Wisdom of the crowd · Global
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Community&rsquo;s Best 11
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Mixed across all national teams. Based on {stats.totalSubmissions} submission
          {stats.totalSubmissions === 1 ? "" : "s"}. Each slot shows the player picked most often
          worldwide for that position.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {formationDef && (
          <FormationPitch
            formation={formationDef}
            starters={startersResolved}
            readOnly
            pickRates={pickRates}
            showPhotos
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

          <Card title="Most-picked players">
            <ol className="space-y-2 text-sm">
              {stats.topPlayers.length === 0 && (
                <li className="text-zinc-500">No data yet.</li>
              )}
              {stats.topPlayers.map((b, i) => (
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
        <Link href="/countries">
          <Button size="lg">Submit your own XI</Button>
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
