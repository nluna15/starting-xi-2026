import { CountrySearch } from "@/components/countries/country-search";
import { SectionHeading } from "@/components/home/section-heading";
import { JsonLd } from "@/components/json-ld";
import { getRosterStatusByCode } from "@/lib/db/queries";
import { buildBreadcrumbSchema } from "@/lib/json-ld";
import { WC_2026_SLOTS } from "@/lib/wc-2026-teams";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose a Country",
  description:
    "Pick one of the 48 nations competing in the 2026 FIFA World Cup and build your ideal starting XI.",
  alternates: { canonical: "/countries" },
};

export default async function CountriesPage() {
  const statusByCode = await getRosterStatusByCode();

  const HOST_ORDER = ["USA", "CAN", "MEX"];
  const confirmed = WC_2026_SLOTS.filter((s) => s.kind === "confirmed")
    .sort((a, b) => {
      if (a.kind !== "confirmed" || b.kind !== "confirmed") return 0;
      const aHost = HOST_ORDER.indexOf(a.code);
      const bHost = HOST_ORDER.indexOf(b.code);
      if (aHost !== -1 || bHost !== -1) {
        return (aHost === -1 ? Infinity : aHost) - (bHost === -1 ? Infinity : bHost);
      }
      return a.name.localeCompare(b.name);
    })
    .flatMap((slot) =>
      slot.kind === "confirmed"
        ? [
            {
              code: slot.code,
              name: slot.name,
              flagEmoji: slot.flagEmoji,
              enabled: (statusByCode.get(slot.code) ?? "missing") === "ready",
            },
          ]
        : [],
    );

  const tbd = WC_2026_SLOTS.filter((s) => s.kind === "tbd");

  return (
    <div className="space-y-10 py-2">
      <JsonLd data={buildBreadcrumbSchema([
        { name: "Home", href: "/" },
        { name: "Countries", href: "/countries" },
      ])} />
      <header className="space-y-3 text-center">
        <h1 className="display text-[44px] text-ink [text-wrap:balance] sm:text-[52px]">
          Pick your country
        </h1>
        <p className="mx-auto max-w-xl text-pretty text-[14px] text-ink-3">
          Choose a nation, build their starting eleven, and share your picks.
        </p>
      </header>

      <CountrySearch slots={confirmed} />

      {tbd.length > 0 && (
        <section className="space-y-3">
          <SectionHeading eyebrow="01" title="Awaiting qualification" />
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
    <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong bg-bg-sunk px-3 text-center text-ink-faint">
      <span className="text-2xl leading-none" aria-hidden>
        ❔
      </span>
      <span className="cond text-[11px] leading-tight">{label}</span>
    </div>
  );
}
