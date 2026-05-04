"use client";

import * as React from "react";
import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";
import { formatEur, lastName, useMediaQuery } from "@/lib/utils";

export type CommunityStarter = {
  id: number;
  fullName: string;
  photoUrl?: string | null;
  countryCode?: string | null;
  // Used for FIFA codes the soccer-pitch package can't render via regional
  // indicators (ENG, SCO). When set, we inject scoped CSS that places this
  // emoji at the same position the package would have used.
  flagEmojiOverride?: string | null;
  age?: number | null;
  marketValueEur?: number | null;
  club?: string | null;
};

type Props = {
  formation: FormationDef;
  starters: (CommunityStarter | null)[];
  bench?: (CommunityStarter | null)[];
  showPhotos?: boolean;
};

function toPkgPlayer(
  p: CommunityStarter | null,
  showPhotos: boolean,
  shortenName: boolean,
): PkgPlayer | null {
  if (!p) return null;
  const extras: Record<string, string | number> = {};
  if (p.age != null) extras["Age"] = p.age;
  if (p.marketValueEur != null) extras["Value"] = formatEur(p.marketValueEur);
  if (p.club) extras["Club"] = p.club;
  return {
    id: String(p.id),
    name: shortenName ? lastName(p.fullName) : p.fullName,
    photoUrl: showPhotos ? p.photoUrl ?? undefined : undefined,
    countryCode: p.countryCode ?? undefined,
    extras: Object.keys(extras).length > 0 ? extras : undefined,
  };
}

// Mirrors the inline style the soccer-pitch package puts on its own flag span
// (right: -12%, bottom: -8%, fontSize: var(--sp-flag-fs)) so the override sits
// in the same spot as a regular regional-indicator flag.
function flagOverrideCSS(
  scope: string,
  starters: (CommunityStarter | null)[],
  bench: (CommunityStarter | null)[] | undefined,
): string {
  const rules: string[] = [];

  starters.forEach((p, i) => {
    if (!p?.flagEmojiOverride) return;
    const sel = `.${scope} .sp-soccer-pitch > .sp-relative > .sp-absolute.sp-inset-0:last-child > :nth-child(${i + 1}) .sp-aspect-square`;
    rules.push(`${sel}::after {
      content: "${p.flagEmojiOverride}";
      position: absolute;
      right: -12%;
      bottom: -8%;
      font-size: var(--sp-flag-fs);
      line-height: 1;
      pointer-events: none;
    }`);
  });

  bench?.forEach((p, i) => {
    if (!p?.flagEmojiOverride) return;
    const sel = `.${scope} .sp-bench-row > .sp-absolute > :nth-child(${i + 1}) .sp-aspect-square`;
    rules.push(`${sel}::after {
      content: "${p.flagEmojiOverride}";
      position: absolute;
      right: -12%;
      bottom: -8%;
      font-size: var(--sp-flag-fs);
      line-height: 1;
      pointer-events: none;
    }`);
  });

  return rules.join("\n");
}

export function CommunityPitch({ formation, starters, bench, showPhotos = true }: Props) {
  const isNarrow = useMediaQuery("(max-width: 410px)");
  const rawId = React.useId();
  const scopeClass = `sp-scope-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const pkgFormation = {
    name: formation.name,
    slots: formation.slots.map((s) => ({
      x: s.x,
      y: 100 - s.y,
      role: s.slot,
    })),
  };
  const pkgPlayers = starters.map((p) => toPkgPlayer(p, showPhotos, isNarrow));
  const pkgBench = bench?.map((p) => toPkgPlayer(p, showPhotos, isNarrow));

  const overrideCSS = flagOverrideCSS(scopeClass, starters, bench);

  return (
    <div className={scopeClass}>
      {overrideCSS && <style>{overrideCSS}</style>}
      <SoccerPitch
        formation={pkgFormation}
        players={pkgPlayers}
        bench={pkgBench}
        theme="grass"
        showNames
        showFlags
      />
    </div>
  );
}
