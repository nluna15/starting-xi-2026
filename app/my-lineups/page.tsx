import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecentSubmissionsFeed } from "@/components/community/recent-submissions-feed";
import { getRecentSubmissions } from "@/lib/db/queries";
import { readFingerprint } from "@/lib/fingerprint";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Lineups",
};

// Per-browser lineup history. Identity is the wcr_fp cookie set by
// lib/fingerprint.ts — no account required. Clearing cookies or switching
// browsers/devices starts fresh; cross-device recovery is intentionally out of
// scope.
export default async function MyLineupsPage() {
  const fingerprint = await readFingerprint();
  const submissions = fingerprint
    ? await getRecentSubmissions(200, { fingerprint })
    : [];

  if (submissions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          🏆
        </span>
        <h1 className="display text-[44px] text-ink [text-wrap:balance] sm:text-[52px]">
          No lineups on this browser yet
        </h1>
        <p className="max-w-md text-[14px] text-ink-3">
          Lineups you build are saved to this browser, no account needed.
          Clearing cookies or switching browsers will hide them.
        </p>
        <Link href="/countries">
          <Button>Pick a country</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="display text-[44px] text-ink [text-wrap:balance] sm:text-[52px]">
          My Lineups
        </h1>
        <p className="text-[13px] text-ink-3">
          Saved to this browser. Clearing cookies or switching browsers will hide
          them.
        </p>
      </header>
      <RecentSubmissionsFeed submissions={submissions} title={null} />
    </div>
  );
}
