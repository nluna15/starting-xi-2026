import { sql } from "drizzle-orm";
import { db } from "./client";
import { normalizeRoutePath } from "@/lib/path-template";

/* Query layer for the dev-only /internal/analytics dashboard. Every metric is
   fingerprint-based (the `wcr_fp` cookie is the only user unit) and scoped to a
   [from, to) time window. Patterns follow scripts/last-7-days.ts and
   scripts/lineups-by-day-country.ts. */

export type Window = { from: Date; to: Date };

/** Named community/share events surfaced in the click breakdown. */
const CLICK_EVENTS = [
  "share_squad",
  "download_squad",
  "community_country",
  "community_recent_card",
  "community_insight_expand",
  "community_pick_cta",
] as const;

export type ReturnRate = {
  days: 1 | 3 | 7;
  eligible: number;
  returned: number;
  /** returned / eligible, or null when no fingerprint is eligible yet. */
  rate: number | null;
};

export type Funnel = {
  builders: number;
  submitters: number;
  converters: number;
  /** converters / builders, or null when there are no builders. */
  conversionRate: number | null;
};

export type CompletionTime = {
  n: number;
  meanSecs: number | null;
  medianSecs: number | null;
};

export type LineupsPerUser = {
  users: number;
  mean: number | null;
  median: number | null;
  max: number | null;
  exactlyOne: number;
  twoPlus: number;
  /** Repeat (2+) users whose submissions all fall on one UTC calendar day. */
  twoPlusSameDay: number;
  /** Repeat (2+) users who submitted across 2+ distinct UTC calendar days. */
  twoPlusMultiDay: number;
};

export type ConversionBucket = {
  /** Inclusive bucket start, UTC YYYY-MM-DD. */
  start: string;
  /** Exclusive bucket end, UTC YYYY-MM-DD. The last bucket is truncated to the
   *  window's `to`, so it may span fewer than 3 days. */
  end: string;
  builders: number;
  converters: number;
  /** converters / builders, or null when the bucket has no builders. */
  rate: number | null;
};

export type LineupsHistoryPoint = {
  /** UTC YYYY-MM-DD calendar day. */
  date: string;
  count: number;
};

export type ClickBreakdown = {
  name: string;
  clicks: number;
  uniqueUsers: number;
};

export type ShareConversion = {
  submitters: number;
  sharingSubmitters: number;
  /** sharingSubmitters / submitters, or null when there are no submitters. */
  rate: number | null;
};

export type TopPage = {
  template: string;
  views: number;
  uniqueUsers: number;
};

export type AnalyticsData = {
  window: { from: string; to: string };
  returnRates: ReturnRate[];
  funnel: Funnel;
  completionTime: CompletionTime;
  lineupsPerUser: LineupsPerUser;
  clicks: ClickBreakdown[];
  conversionSeries: ConversionBucket[];
  lineupsHistory: LineupsHistoryPoint[];
  totalLineupsToDate: number;
  shareConversion: ShareConversion;
  topPages: TopPage[];
};

/* -------------------------------------------------------------------------- */

/** D1/D3/D7 return rate for the cohort first-seen within the window. A user is
 *  "returned" if they had activity (a submission or an event) on a later
 *  calendar day, within N days of first-seen. Only fingerprints whose window
 *  has fully elapsed (first_seen <= now - N days) count toward `eligible`. */
export async function getReturnRates({ from, to }: Window): Promise<ReturnRate[]> {
  const res = await db.execute(sql`
    with activity as (
      select fingerprint, created_at from submissions where fingerprint is not null
      union all
      select fingerprint, created_at from events where fingerprint is not null
    ),
    firsts as (
      select fingerprint, min(created_at) as first_seen
      from activity group by fingerprint
    ),
    cohort as (
      select fingerprint, first_seen from firsts
      where first_seen >= ${from.toISOString()} and first_seen < ${to.toISOString()}
    ),
    windows as (select days from (values (1),(3),(7)) as w(days)),
    eligible as (
      select w.days, c.fingerprint, c.first_seen
      from cohort c cross join windows w
      where c.first_seen <= now() - (w.days || ' days')::interval
    ),
    returned as (
      select distinct e.days, e.fingerprint
      from eligible e
      join activity a
        on a.fingerprint = e.fingerprint
       and a.created_at > e.first_seen
       and a.created_at <= e.first_seen + (e.days || ' days')::interval
       and (a.created_at at time zone 'UTC')::date > (e.first_seen at time zone 'UTC')::date
    )
    select
      el.days::int as days,
      count(distinct el.fingerprint)::int as eligible,
      count(distinct r.fingerprint)::int as returned
    from eligible el
    left join returned r on r.days = el.days and r.fingerprint = el.fingerprint
    group by el.days
    order by el.days
  `);

  const byDay = new Map<number, { eligible: number; returned: number }>();
  for (const row of res.rows as { days: number; eligible: number; returned: number }[]) {
    byDay.set(row.days, { eligible: row.eligible, returned: row.returned });
  }
  return ([1, 3, 7] as const).map((days) => {
    const r = byDay.get(days) ?? { eligible: 0, returned: 0 };
    return {
      days,
      eligible: r.eligible,
      returned: r.returned,
      rate: r.eligible > 0 ? r.returned / r.eligible : null,
    };
  });
}

/** Pick-team → submit funnel. Builders = fingerprints that viewed a
 *  `/:teamCode/build` page in the window; converters = builders who also
 *  submitted in the window. */
export async function getFunnel({ from, to }: Window): Promise<Funnel> {
  const res = await db.execute(sql`
    with builders as (
      select distinct fingerprint from events
      where name = 'page_view'
        and path ~ '^/[^/]+/build/?$'
        and created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
        and fingerprint is not null
    ),
    submitters as (
      select distinct fingerprint from submissions
      where created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
    )
    select
      (select count(*)::int from builders) as builders,
      (select count(*)::int from submitters) as submitters,
      (select count(*)::int from builders b
        join submitters s on s.fingerprint = b.fingerprint) as converters
  `);
  const row = (res.rows[0] as { builders: number; submitters: number; converters: number }) ?? {
    builders: 0,
    submitters: 0,
    converters: 0,
  };
  return {
    builders: row.builders,
    submitters: row.submitters,
    converters: row.converters,
    conversionRate: row.builders > 0 ? row.converters / row.builders : null,
  };
}

/** The funnel conversion rate over time, in 3-day buckets anchored at the
 *  window's `from`. A bucket's converters are builders who also submitted
 *  within the same bucket, so a user who builds in one bucket and submits in
 *  the next counts as a converter in neither — buckets won't reconcile exactly
 *  with the window-wide funnel. Empty buckets are zero-filled; the last bucket
 *  is truncated to `to`. */
export async function getConversionSeries({ from, to }: Window): Promise<ConversionBucket[]> {
  const BUCKET_SECS = 3 * 86400;
  const nBuckets = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (BUCKET_SECS * 1000)),
  );

  const res = await db.execute(sql`
    with buckets as (
      select i as idx,
             ${from.toISOString()}::timestamptz + (i * interval '3 days') as bucket_start,
             least(
               ${from.toISOString()}::timestamptz + ((i + 1) * interval '3 days'),
               ${to.toISOString()}::timestamptz
             ) as bucket_end
      from generate_series(0, ${nBuckets - 1}) as g(i)
    ),
    builders as (
      select distinct
             floor(extract(epoch from (created_at - ${from.toISOString()}::timestamptz)) / ${BUCKET_SECS})::int as idx,
             fingerprint
      from events
      where name = 'page_view'
        and path ~ '^/[^/]+/build/?$'
        and created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
        and fingerprint is not null
    ),
    subs as (
      select distinct
             floor(extract(epoch from (created_at - ${from.toISOString()}::timestamptz)) / ${BUCKET_SECS})::int as idx,
             fingerprint
      from submissions
      where created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
        and fingerprint is not null
    ),
    agg as (
      select b.idx,
             count(distinct b.fingerprint)::int as builders,
             count(distinct b.fingerprint) filter (where s.fingerprint is not null)::int as converters
      from builders b
      left join subs s on s.idx = b.idx and s.fingerprint = b.fingerprint
      group by b.idx
    )
    select
      to_char(bk.bucket_start at time zone 'UTC', 'YYYY-MM-DD') as bucket_start,
      to_char(bk.bucket_end at time zone 'UTC', 'YYYY-MM-DD') as bucket_end,
      coalesce(a.builders, 0)::int as builders,
      coalesce(a.converters, 0)::int as converters
    from buckets bk
    left join agg a on a.idx = bk.idx
    order by bk.idx
  `);

  return (
    res.rows as {
      bucket_start: string;
      bucket_end: string;
      builders: number;
      converters: number;
    }[]
  ).map((row) => ({
    start: row.bucket_start,
    end: row.bucket_end,
    builders: row.builders,
    converters: row.converters,
    rate: row.builders > 0 ? row.converters / row.builders : null,
  }));
}

/** Lineups submitted per UTC calendar day within the window, zero-filled for
 *  days with no submissions. */
export async function getLineupsHistory({ from, to }: Window): Promise<LineupsHistoryPoint[]> {
  const res = await db.execute(sql`
    with days as (
      select generate_series(
        ${from.toISOString()}::timestamptz,
        ${to.toISOString()}::timestamptz - interval '1 day',
        interval '1 day'
      ) as day
    ),
    counts as (
      select (created_at at time zone 'UTC')::date as day, count(*)::int as n
      from submissions
      where created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
      group by 1
    )
    select
      to_char(d.day at time zone 'UTC', 'YYYY-MM-DD') as date,
      coalesce(c.n, 0)::int as count
    from days d
    left join counts c on c.day = (d.day at time zone 'UTC')::date
    order by d.day
  `);

  return (res.rows as { date: string; count: number }[]).map((row) => ({
    date: row.date,
    count: row.count,
  }));
}

/** Total lineups submitted across all time, independent of the selected
 *  window — the "to date" figure. */
export async function getTotalLineupsToDate(): Promise<number> {
  const res = await db.execute(sql`select count(*)::int as count from submissions`);
  return (res.rows[0] as { count: number } | undefined)?.count ?? 0;
}

/** Median/mean seconds from first `/:teamCode/build` view to the matching
 *  submission (same fingerprint + team), excluding pairs longer than 10
 *  minutes (treated as abandoned attempts). */
export async function getCompletionTime({ from, to }: Window): Promise<CompletionTime> {
  const res = await db.execute(sql`
    with build_views as (
      select fingerprint,
             lower(split_part(path, '/', 2)) as team_code,
             min(created_at) as first_view
      from events
      where name = 'page_view'
        and path ~ '^/[^/]+/build/?$'
        and created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
        and fingerprint is not null
      group by fingerprint, lower(split_part(path, '/', 2))
    ),
    subs as (
      select s.fingerprint, lower(t.code) as team_code, s.created_at as submit_at
      from submissions s
      join teams t on t.id = s.team_id
      where s.created_at >= ${from.toISOString()} and s.created_at < ${to.toISOString()}
    ),
    paired as (
      select bv.first_view, min(su.submit_at) as submit_at
      from build_views bv
      join subs su
        on su.fingerprint = bv.fingerprint
       and su.team_code = bv.team_code
       and su.submit_at >= bv.first_view
      group by bv.fingerprint, bv.team_code, bv.first_view
    ),
    deltas as (
      select extract(epoch from (submit_at - first_view)) as secs
      from paired
      where submit_at - first_view <= interval '10 minutes'
    )
    select
      count(*)::int as n,
      round(avg(secs))::int as mean_secs,
      round(percentile_cont(0.5) within group (order by secs))::int as median_secs
    from deltas
  `);
  const row = (res.rows[0] as { n: number; mean_secs: number | null; median_secs: number | null }) ?? {
    n: 0,
    mean_secs: null,
    median_secs: null,
  };
  return { n: row.n, meanSecs: row.mean_secs, medianSecs: row.median_secs };
}

/** Lineups submitted per fingerprint in the window: mean/median/max plus the
 *  1-vs-2+ split, with repeat (2+) users further split by whether all their
 *  submissions landed on the same UTC calendar day. */
export async function getLineupsPerUser({ from, to }: Window): Promise<LineupsPerUser> {
  const res = await db.execute(sql`
    with per_user as (
      select fingerprint,
             count(*)::int as n,
             count(distinct (created_at at time zone 'UTC')::date)::int as days
      from submissions
      where created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
      group by fingerprint
    )
    select
      count(*)::int as users,
      round(avg(n), 2)::float as mean,
      percentile_cont(0.5) within group (order by n)::float as median,
      max(n)::int as max,
      count(*) filter (where n = 1)::int as exactly_one,
      count(*) filter (where n >= 2)::int as two_plus,
      count(*) filter (where n >= 2 and days = 1)::int as two_plus_same_day,
      count(*) filter (where n >= 2 and days > 1)::int as two_plus_multi_day
    from per_user
  `);
  const row = (res.rows[0] as {
    users: number;
    mean: number | null;
    median: number | null;
    max: number | null;
    exactly_one: number;
    two_plus: number;
    two_plus_same_day: number;
    two_plus_multi_day: number;
  }) ?? {
    users: 0,
    mean: null,
    median: null,
    max: null,
    exactly_one: 0,
    two_plus: 0,
    two_plus_same_day: 0,
    two_plus_multi_day: 0,
  };
  return {
    users: row.users,
    mean: row.mean,
    median: row.median,
    max: row.max,
    exactlyOne: row.exactly_one,
    twoPlus: row.two_plus,
    twoPlusSameDay: row.two_plus_same_day,
    twoPlusMultiDay: row.two_plus_multi_day,
  };
}

/** Clicks + unique fingerprints per share/community event in the window. */
export async function getClickBreakdown({ from, to }: Window): Promise<ClickBreakdown[]> {
  const res = await db.execute(sql`
    select
      name,
      count(*)::int as clicks,
      count(distinct fingerprint)::int as unique_users
    from events
    where created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
      and name in ${sql.raw(`(${CLICK_EVENTS.map((n) => `'${n}'`).join(", ")})`)}
    group by name
  `);
  const byName = new Map<string, ClickBreakdown>();
  for (const row of res.rows as { name: string; clicks: number; unique_users: number }[]) {
    byName.set(row.name, { name: row.name, clicks: row.clicks, uniqueUsers: row.unique_users });
  }
  // Return every known event (zero-filled) in a stable order.
  return CLICK_EVENTS.map(
    (name) => byName.get(name) ?? { name, clicks: 0, uniqueUsers: 0 },
  );
}

/** Share/download reach: how many of the window's submitters also shared or
 *  downloaded a squad. */
export async function getShareConversion({ from, to }: Window): Promise<ShareConversion> {
  const res = await db.execute(sql`
    with submitters as (
      select distinct fingerprint from submissions
      where created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
    ),
    sharers as (
      select distinct fingerprint from events
      where name in ('share_squad', 'download_squad')
        and created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
        and fingerprint is not null
    )
    select
      (select count(*)::int from submitters) as submitters,
      (select count(*)::int from submitters s
        where exists (select 1 from sharers h where h.fingerprint = s.fingerprint))
        as sharing_submitters
  `);
  const row = (res.rows[0] as { submitters: number; sharing_submitters: number }) ?? {
    submitters: 0,
    sharing_submitters: 0,
  };
  return {
    submitters: row.submitters,
    sharingSubmitters: row.sharing_submitters,
    rate: row.submitters > 0 ? row.sharing_submitters / row.submitters : null,
  };
}

/** Top 10 pages by pageview volume, collapsed to normalized route templates
 *  (e.g. every `/arg/build` → `/:teamCode/build`). Raw (path, fingerprint)
 *  rows are pulled and normalized here so unique-user counts stay accurate per
 *  template and the JS normalizer remains the single source of truth. */
export async function getTopPages({ from, to }: Window): Promise<TopPage[]> {
  const res = await db.execute(sql`
    select path, fingerprint, count(*)::int as views
    from events
    where name = 'page_view'
      and created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}
    group by path, fingerprint
  `);

  const agg = new Map<string, { views: number; users: Set<string> }>();
  for (const row of res.rows as { path: string | null; fingerprint: string | null; views: number }[]) {
    if (!row.path) continue;
    const template = normalizeRoutePath(row.path);
    let entry = agg.get(template);
    if (!entry) {
      entry = { views: 0, users: new Set() };
      agg.set(template, entry);
    }
    entry.views += row.views;
    if (row.fingerprint) entry.users.add(row.fingerprint);
  }

  return [...agg.entries()]
    .map(([template, v]) => ({ template, views: v.views, uniqueUsers: v.users.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

/** Runs every dashboard query for the given window in parallel. */
export async function getAnalyticsData(window: Window): Promise<AnalyticsData> {
  const [
    returnRates,
    funnel,
    completionTime,
    lineupsPerUser,
    clicks,
    conversionSeries,
    lineupsHistory,
    totalLineupsToDate,
    shareConversion,
    topPages,
  ] = await Promise.all([
    getReturnRates(window),
    getFunnel(window),
    getCompletionTime(window),
    getLineupsPerUser(window),
    getClickBreakdown(window),
    getConversionSeries(window),
    getLineupsHistory(window),
    getTotalLineupsToDate(),
    getShareConversion(window),
    getTopPages(window),
  ]);

  return {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    returnRates,
    funnel,
    completionTime,
    lineupsPerUser,
    clicks,
    conversionSeries,
    lineupsHistory,
    totalLineupsToDate,
    shareConversion,
    topPages,
  };
}
