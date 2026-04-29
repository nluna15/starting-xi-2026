import { CountryTile } from "@/components/country-tile";
import { getRosterStatusByCode } from "@/lib/db/queries";
import { WC_2026_SLOTS } from "@/lib/wc-2026-teams";

export const dynamic = "force-dynamic";

export default async function CountriesPage() {
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
                <CountryTile
                  code={slot.code}
                  name={slot.name}
                  flagEmoji={slot.flagEmoji}
                  enabled={status === "ready"}
                  layout="card"
                  size="md"
                />
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
