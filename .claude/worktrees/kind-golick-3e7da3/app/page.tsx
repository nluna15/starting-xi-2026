import Link from "next/link";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { players, teams } from "@/lib/db/schema";
import { WC_2026_SLOTS, type WcSlot } from "@/lib/wc-2026-teams";
import { cn } from "@/lib/utils";

type ConfirmedSlot = Extract<WcSlot, { kind: "confirmed" }>;

export const dynamic = "force-dynamic";

type RosterStatus = "ready" | "empty" | "missing";

async function getRosterStatusByCode(): Promise<Map<string, RosterStatus>> {
  const rows = await db
    .select({ code: teams.code, count: sql<number>`count(${players.id})::int` })
    .from(teams)
    .leftJoin(players, eq(players.teamId, teams.id))
    .groupBy(teams.id, teams.code);

  const map = new Map<string, RosterStatus>();
  for (const r of rows) {
    map.set(r.code, Number(r.count) > 0 ? "ready" : "empty");
  }
  return map;
}

export default async function Home() {
  const statusByCode = await getRosterStatusByCode();

  const HOST_ORDER = ["USA", "CAN", "MEX"];
  const confirmed = WC_2026_SLOTS.filter((s) => s.kind === "confirmed").sort((a, b) => {
    if (a.kind !== "confirmed" || b.kind !== "confirmed") return 0;
    const aHost = HOST_ORDER.indexOf(a.code);
    const bHost = HOST_ORDER.indexOf(b.code);
    if (aHost !== -1 || bHost !== -1) {
      return (aHost === -1 ? Infinity : aHost) - (bHost === -1 ? Infinity : bHost);
    }
    return a.name.localeCompare(b.name);
  });
  const tbd = WC_2026_SLOTS.filter((s) => s.kind === "tbd");

  return (
    <div className="space-y-8 py-2">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
          World Cup 2026 · 48 teams
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Pick your country
        </h1>
        <p className="mx-auto max-w-xl text-pretty text-sm text-zinc-400">
          Choose a nation, build their starting eleven, and share your picks.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Confirmed teams
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {confirmed.map((slot) => {
            if (slot.kind !== "confirmed") return null;
            const status = statusByCode.get(slot.code) ?? "missing";
            return (
              <li key={slot.code}>
                <TeamTile slot={slot} status={status} />
              </li>
            );
          })}
        </ul>
      </section>

      {tbd.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Awaiting qualification
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {tbd.map((slot) => {
              if (slot.kind !== "tbd") return null;
              return (
                <li key={slot.key}>
                  <TbdTile label={slot.label} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function TeamTile({ slot, status }: { slot: ConfirmedSlot; status: RosterStatus }) {
  const ready = status === "ready";
  const inner = (
    <div
      className={cn(
        "flex h-24 flex-col items-center justify-center gap-1 rounded-lg border px-3 text-center transition",
        ready
          ? "border-zinc-800 bg-zinc-900 hover:border-blue-500 hover:bg-zinc-800"
          : "cursor-not-allowed border-dashed border-zinc-800 bg-zinc-950 text-zinc-500",
      )}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {slot.flagEmoji}
      </span>
      <span className="text-xs font-semibold leading-tight text-zinc-100">{slot.name}</span>
      {!ready && <span className="text-[10px] uppercase tracking-wide">Roster coming soon</span>}
    </div>
  );

  if (!ready) return inner;

  return (
    <Link href={`/${slot.code}/build`} aria-label={`Build the ${slot.name} XI`}>
      {inner}
    </Link>
  );
}

function TbdTile({ label }: { label: string }) {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-800 bg-zinc-950 px-3 text-center text-zinc-500">
      <span className="text-2xl leading-none" aria-hidden>
        ❔
      </span>
      <span className="text-[11px] leading-tight">{label}</span>
    </div>
  );
}
