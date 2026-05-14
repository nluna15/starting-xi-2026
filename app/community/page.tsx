import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CommunityCountryCarousel } from "@/components/community/country-carousel";
import { CommunityPitch } from "@/components/community-pitch";
import { InsightStatCard } from "@/components/community/insight-stat-card";
import { RecentSubmissionsFeed } from "@/components/community/recent-submissions-feed";
import type { BarRow } from "@/components/horizontal-bar-chart";
import {
  getCountrySquadStats,
  getGlobalCrowdStats,
  getRecentSubmissions,
  getRosterStatusByCode,
} from "@/lib/db/queries";
import { FIFA_FLAG_OVERRIDES, FIFA_TO_ISO2, WC_2026_SLOTS } from "@/lib/wc-2026-teams";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function CommunityPage() {
  const [stats, countryStats, statusByCode, recentSubmissions] = await Promise.all([
    getGlobalCrowdStats(),
    getCountrySquadStats(),
    getRosterStatusByCode(),
    getRecentSubmissions(12),
  ]);

  const readyCodes = WC_2026_SLOTS.flatMap((s) =>
    s.kind === "confirmed" && statusByCode.get(s.code) === "ready" ? [s.code] : [],
  );

  const ageRowsAll: BarRow[] = [...countryStats]
    .sort((a, b) => b.avgAge - a.avgAge)
    .map((c) => ({
      key: c.code,
      label: c.code,
      flagEmoji: c.flagEmoji,
      value: c.avgAge,
    }));
  const oldestRows = ageRowsAll.slice(0, 4);
  const youngestRows = ageRowsAll.slice(-4).reverse();

  const valueRowsAll: BarRow[] = [...countryStats]
    .sort((a, b) => b.avgMarketValueEur - a.avgMarketValueEur)
    .map((c) => ({
      key: c.code,
      label: c.code,
      flagEmoji: c.flagEmoji,
      value: c.avgMarketValueEur,
    }));
  const mostExpensiveRows = valueRowsAll.slice(0, 5);
  const cheapestRows = valueRowsAll.slice(-3).reverse();

  const capsRowsAll: BarRow[] = [...countryStats]
    .sort((a, b) => b.avgInternationalCaps - a.avgInternationalCaps)
    .map((c) => ({
      key: c.code,
      label: c.code,
      flagEmoji: c.flagEmoji,
      value: c.avgInternationalCaps,
    }));
  const mostCapsRows = capsRowsAll.slice(0, 4);
  const leastCapsRows = capsRowsAll.slice(-4).reverse();

  if (stats.totalSubmissions === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          🏆
        </span>
        <h1 className="display text-[44px] text-ink sm:text-[52px]">No submissions yet</h1>
        <p className="max-w-md text-[14px] text-ink-3">
          Be the first to submit a lineup and the community page will start to fill in.
        </p>
        <Link href="/countries">
          <Button>Pick a country</Button>
        </Link>
      </div>
    );
  }

  const slots = stats.mostLikelyXi.slots;
  const startersResolved = slots.map((s) =>
    s.player
      ? {
          id: s.player.id,
          fullName: s.player.fullName,
          photoUrl: s.player.photoUrl,
          countryCode: s.teamCode ? FIFA_TO_ISO2[s.teamCode] ?? null : null,
          flagEmojiOverride: s.teamCode ? FIFA_FLAG_OVERRIDES[s.teamCode] ?? null : null,
          age: s.player.age,
          marketValueEur: s.player.marketValueEur,
          club: s.player.club,
        }
      : null,
  );

  const formationDef = stats.mostLikelyXi.formation
    ? { name: stats.mostLikelyXi.formation.name, slots: stats.mostLikelyXi.formation.slots }
    : null;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <section>
          <CommunityCountryCarousel
            slots={WC_2026_SLOTS}
            readyCodes={readyCodes}
            linkMode="community"
          />
        </section>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="display text-[44px] text-ink [text-wrap:balance] sm:text-[52px]">
              All Fan's Popular 11
            </h1>
          </div>
          <Link href="/countries" className="sm:shrink-0">
            <Button size="lg">Pick a country</Button>
          </Link>
        </header>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {formationDef && (
          <div className="community-page-pitch mx-auto w-[81%] max-w-[420px] pb-10 lg:max-w-[560px]">
            <CommunityPitch
              formation={formationDef}
              starters={startersResolved}
              showPhotos
            />
          </div>
        )}
        <div className="space-y-3">
          <StatCard title="Most-popular formation">
            <div className="display text-[34px] text-ink">{stats.topFormation?.name ?? "—"}</div>
            <ul className="mt-2 space-y-1">
              {stats.formationCounts.slice(0, 6).map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="cond text-[12px] font-bold text-ink">{f.name}</span>
                  <span className="mono text-[12px] text-ink-3">
                    {f.count} ({Math.round((f.count / stats.totalSubmissions) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </StatCard>

          <StatCard title="Most-picked players">
            <ol className="space-y-2">
              {stats.topPlayers.length === 0 && (
                <li className="text-[13px] text-ink-3">No data yet.</li>
              )}
              {stats.topPlayers.map((b, i) => (
                <li
                  key={b.player.id}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="mono w-5 shrink-0 text-[12px] text-ink-faint">
                      {i + 1}.
                    </span>
                    <span className="truncate font-medium text-ink">
                      {b.player.fullName}
                    </span>
                    <span className="mono text-[11px] text-ink-faint">
                      {b.player.detailedPosition}
                    </span>
                    {b.teamCode && (
                      <span className="mono text-[11px] text-ink-faint">{b.teamCode}</span>
                    )}
                  </span>
                  <span className="mono text-[12px] text-ink-2">
                    {Math.round(b.rate * 100)}%
                  </span>
                </li>
              ))}
            </ol>
          </StatCard>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="display text-[28px] text-ink sm:text-[32px]">
          Insights based on community lineups
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <InsightStatCard
            title="Average squad age"
            segments={[
              { subhead: "Oldest", rows: oldestRows },
              { subhead: "Youngest", rows: youngestRows },
            ]}
            allRows={ageRowsAll}
            format="decimal"
          />
          <InsightStatCard
            title="Market value per player"
            segments={[
              { subhead: "Most expensive", rows: mostExpensiveRows },
              { subhead: "Lowest value", rows: cheapestRows },
            ]}
            allRows={valueRowsAll}
            format="eurCompact"
          />
          <InsightStatCard
            title="Int'l Caps per Player"
            segments={[
              { subhead: "Most Int’l caps", rows: mostCapsRows },
              { subhead: "Least Int’l caps", rows: leastCapsRows },
            ]}
            allRows={capsRowsAll}
            format="decimal"
          />
        </div>
      </section>
      <RecentSubmissionsFeed submissions={recentSubmissions} />
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Local StatCard wrapper: design-system Card + handoff §6 card-header pattern
   (cond 13px ink, hairline divider underneath, 8px gap to body content).
   ----------------------------------------------------------------------------- */
function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section">
      <h2 className="cond border-b border-line pb-2 text-[13px] text-ink">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}
