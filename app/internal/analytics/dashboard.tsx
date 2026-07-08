import { Card } from "@/components/ui/card";
import type { AnalyticsData } from "@/lib/db/analytics";
import { DateRangePicker } from "./date-range-picker";

/* Presentational dashboard for /internal/analytics. All figures are
   fingerprint-based and scoped to the selected window. */

const CLICK_LABELS: Record<string, string> = {
  share_squad: "Share squad",
  download_squad: "Download squad",
  community_country: "Community country tile",
  community_recent_card: "Recent-submission card",
  community_insight_expand: "Insight expand",
  community_pick_cta: "Pick-a-country CTA",
};

function pct(x: number | null): string {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function num(x: number | null): string {
  return x == null ? "—" : String(x);
}

function dec(x: number | null): string {
  return x == null ? "—" : x.toFixed(2);
}

function duration(secs: number | null): string {
  if (secs == null) return "—";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function humanDate(iso: string): string {
  return iso.slice(0, 10);
}

export function AnalyticsDashboard({
  data,
  from,
  to,
}: {
  data: AnalyticsData;
  from: string;
  to: string;
}) {
  return (
    <div className="space-y-8 py-4">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="display text-[36px] text-ink">Internal analytics</h1>
          <p className="text-[12px] text-ink-faint">
            Fingerprint-based · {humanDate(data.window.from)} → {humanDate(to)} · dev-only,
            reads production data
          </p>
        </div>
        <DateRangePicker key={`${from}_${to}`} from={from} to={to} />
      </header>

      {/* Return rates */}
      <Section title="Return rates" hint="Cohort first-seen in window that returned on a later day">
        <div className="grid gap-3 sm:grid-cols-3">
          {data.returnRates.map((r) => (
            <StatTile
              key={r.days}
              label={`D${r.days} return`}
              value={pct(r.rate)}
              sub={`${r.returned} of ${r.eligible} eligible`}
            />
          ))}
        </div>
      </Section>

      {/* Funnel + completion time */}
      <Section title="Pick-team → submit funnel">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Builders" value={num(data.funnel.builders)} sub="viewed a build page" />
          <StatTile
            label="Converters"
            value={num(data.funnel.converters)}
            sub="builders who submitted"
          />
          <StatTile label="Conversion" value={pct(data.funnel.conversionRate)} sub="converters / builders" />
          <StatTile
            label="Submitters"
            value={num(data.funnel.submitters)}
            sub="total, incl. no build view"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Median time to complete"
            value={duration(data.completionTime.medianSecs)}
            sub="build view → submit"
          />
          <StatTile
            label="Mean time to complete"
            value={duration(data.completionTime.meanSecs)}
            sub="≤ 10 min pairs only"
          />
          <StatTile
            label="Completions measured"
            value={num(data.completionTime.n)}
            sub="paired build → submit"
          />
        </div>
      </Section>

      {/* Lineups per user */}
      <Section title="Lineups per user">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Users" value={num(data.lineupsPerUser.users)} sub="submitted ≥ 1" />
          <StatTile label="Mean" value={dec(data.lineupsPerUser.mean)} sub="lineups / user" />
          <StatTile label="Median" value={dec(data.lineupsPerUser.median)} sub="lineups / user" />
          <StatTile label="Max" value={num(data.lineupsPerUser.max)} sub="most by one user" />
          <StatTile
            label="1 vs 2+"
            value={`${data.lineupsPerUser.exactlyOne} / ${data.lineupsPerUser.twoPlus}`}
            sub="one-time / repeat"
          />
        </div>
      </Section>

      {/* Share / download reach + click breakdown */}
      <Section title="Share & click events">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Submitters who share/download"
            value={pct(data.shareConversion.rate)}
            sub={`${data.shareConversion.sharingSubmitters} of ${data.shareConversion.submitters}`}
          />
        </div>
        <ClickTable clicks={data.clicks} />
      </Section>

      {/* Top pages */}
      <Section title="Top pages" hint="By pageview volume, grouped by route template">
        <TopPagesTable pages={data.topPages} />
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
        <h2 className="cond text-[15px] tracking-[0.04em] text-ink">{title}</h2>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card padding="compact" className="gap-1">
      <span className="cond text-[11px] tracking-[0.1em] text-ink-faint">{label}</span>
      <span className="mono text-[26px] leading-none text-ink">{value}</span>
      {sub && <span className="text-[11px] text-ink-3">{sub}</span>}
    </Card>
  );
}

function ClickTable({ clicks }: { clicks: AnalyticsData["clicks"] }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              <Th>Event</Th>
              <Th align="right">Clicks</Th>
              <Th align="right">Unique users</Th>
            </tr>
          </thead>
          <tbody>
            {clicks.map((c) => (
              <tr key={c.name} className="border-b border-line last:border-0">
                <Td>{CLICK_LABELS[c.name] ?? c.name}</Td>
                <Td align="right" mono>
                  {c.clicks}
                </Td>
                <Td align="right" mono>
                  {c.uniqueUsers}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TopPagesTable({ pages }: { pages: AnalyticsData["topPages"] }) {
  if (pages.length === 0) {
    return <p className="text-[13px] text-ink-3">No pageviews recorded in this window yet.</p>;
  }
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              <Th>#</Th>
              <Th>Route</Th>
              <Th align="right">Views</Th>
              <Th align="right">Unique users</Th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p, i) => (
              <tr key={p.template} className="border-b border-line last:border-0">
                <Td mono>{i + 1}</Td>
                <Td mono>{p.template}</Td>
                <Td align="right" mono>
                  {p.views}
                </Td>
                <Td align="right" mono>
                  {p.uniqueUsers}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`cond px-3.5 py-2 text-[11px] tracking-[0.1em] text-ink-faint ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-3.5 py-2 text-ink-2 ${align === "right" ? "text-right" : "text-left"} ${
        mono ? "mono text-ink" : ""
      }`}
    >
      {children}
    </td>
  );
}
