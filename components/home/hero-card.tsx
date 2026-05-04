import Link from "next/link";
import { HeroPitch } from "@/components/home/hero-pitch";
import { Button } from "@/components/ui/button";

/* -----------------------------------------------------------------------------
   Home hero — handoff §3 (hero headline 80–110px, balanced wrap, line-height
   0.92) plus a CTA pinned to the editorial right column.
   - Headline uses `clamp(60px, 12vw, 110px)` so the 320px viewport floor still
     fits the two words on a single line; the upper bound is the spec ceiling.
   - Subtitle pair is condensed (the lead) over sans (the supporting count).
   - The pitch package internals are off-limits; this file owns the chrome
     around it only.
   ----------------------------------------------------------------------------- */

type Props = {
  totalSubmissions: number;
  daysUntilKickoff: number;
};

export function HeroCard({ totalSubmissions, daysUntilKickoff }: Props) {
  const submissionsLine =
    totalSubmissions === 0
      ? "Be the first to submit a lineup"
      : `${totalSubmissions.toLocaleString()} Lineup${totalSubmissions === 1 ? "" : "s"} Submitted`;

  const countdownLine =
    daysUntilKickoff <= 0
      ? "Tournament underway"
      : `${daysUntilKickoff} day${daysUntilKickoff === 1 ? "" : "s"} until kickoff`;

  return (
    <div className="p-4 sm:p-6">
      <div className="grid items-center gap-3 md:grid-cols-2">
        <div className="mx-auto w-full max-w-[780px] md:max-w-none">
          <HeroPitch />
        </div>
        <div className="flex w-full flex-col items-start gap-3 text-left md:ml-auto md:w-[300px]">
          <h1
            className="display text-accent [text-wrap:balance]"
            style={{
              fontSize: "clamp(60px, 12vw, 110px)",
              lineHeight: 0.92,
              letterSpacing: "-0.01em",
            }}
          >
            Pick Your Side
          </h1>
          <div className="flex flex-col gap-1">
            <p className="cond text-[15px] font-bold text-ink">{submissionsLine}</p>
            <p className="font-sans text-[13px] text-ink-3">{countdownLine}</p>
          </div>
          <Link href="/countries" className="mt-1 inline-flex">
            <Button variant="primary" size="lg">
              Build Your Squad
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
