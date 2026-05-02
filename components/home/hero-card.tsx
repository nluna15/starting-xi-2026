import Link from "next/link";
import { HeroPitch } from "@/components/home/hero-pitch";
import { Button } from "@/components/ui/button";

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
        <div className="flex w-full flex-col items-start gap-[11px] text-left md:ml-auto md:w-[300px]">
          <h1 className="my-[10px] flex flex-wrap font-[family-name:Geist] text-[60px] font-semibold tracking-[-2.5px] text-[rgb(219,38,39)]">
            Pick Your Side
          </h1>
          <div className="space-y-1">
            <p className="text-xl font-bold text-black sm:text-2xl">{submissionsLine}</p>
            <p className="text-sm text-[#4f4f4f]">{countdownLine}</p>
          </div>
          <Link href="/countries">
            <Button size="lg">Build Your Squad</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
