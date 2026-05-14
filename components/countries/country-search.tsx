"use client";

import { useMemo, useState } from "react";
import { CountryTile } from "@/components/country-tile";
import { cn, normalize } from "@/lib/utils";

type SearchSlot = {
  code: string;
  name: string;
  flagEmoji: string;
  enabled: boolean;
};

type Props = {
  slots: SearchSlot[];
};

export function CountrySearch({ slots }: Props) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return slots;
    return slots.filter(
      (s) => normalize(s.name).includes(q) || normalize(s.code).includes(q),
    );
  }, [query, slots]);

  return (
    <section className="space-y-4">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries…"
          aria-label="Search countries"
          autoFocus
          className={cn(
            "w-full rounded-md border border-line bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-faint",
            "transition-[border-color,box-shadow] duration-150 ease-in-out",
            "hover:border-line-strong",
            "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
          )}
        />
      </div>

      <div aria-live="polite">
        {matches.length === 0 ? (
          <p className="px-1 py-6 text-center text-[13px] text-ink-3">
            No countries match “{query.trim()}”.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {matches.map((slot) => (
              <li key={slot.code}>
                <CountryTile
                  code={slot.code}
                  name={slot.name}
                  flagEmoji={slot.flagEmoji}
                  enabled={slot.enabled}
                  layout="card"
                  size="md"
                  flagSize="xl"
                  showComingSoon={false}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
