import { notFound } from "next/navigation";
import { hasValidUnlock, isDevRuntime } from "@/lib/internal-auth";
import { getAnalyticsData, type Window } from "@/lib/db/analytics";
import { PasskeyForm } from "./passkey-form";
import { AnalyticsDashboard } from "./dashboard";

// Reads cookies + live production data — never cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Internal analytics",
  robots: { index: false, follow: false },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** UTC YYYY-MM-DD for a Date. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolve the window from ?from/&to (YYYY-MM-DD, inclusive `to`), defaulting
 *  to the last 7 days. Returns the query Window plus the inclusive string
 *  bounds used by the picker/header. */
function resolveWindow(sp: {
  from?: string;
  to?: string;
}): { window: Window; from: string; to: string } {
  const today = new Date();
  const defaultTo = isoDate(today);
  const defFrom = new Date(today);
  defFrom.setUTCDate(defFrom.getUTCDate() - 6);
  const defaultFrom = isoDate(defFrom);

  let from = sp.from && DATE_RE.test(sp.from) ? sp.from : defaultFrom;
  let to = sp.to && DATE_RE.test(sp.to) ? sp.to : defaultTo;
  // Guard against an inverted range.
  if (from > to) [from, to] = [to, from];

  // Exclusive end: the day after `to` at 00:00 UTC, so `to` is fully included.
  const toExclusive = new Date(`${to}T00:00:00.000Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  return {
    window: { from: new Date(`${from}T00:00:00.000Z`), to: toExclusive },
    from,
    to,
  };
}

export default async function InternalAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  // Layer 1: unreachable outside local dev.
  if (!isDevRuntime()) notFound();

  // Layer 2: passkey unlock cookie.
  if (!(await hasValidUnlock())) {
    return <PasskeyForm />;
  }

  const { window, from, to } = resolveWindow(await searchParams);
  const data = await getAnalyticsData(window);

  return <AnalyticsDashboard data={data} from={from} to={to} />;
}
