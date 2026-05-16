"use client";

import * as React from "react";
import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";
import { hoverCardClampCSS } from "@/lib/pitch-hover-clamp";
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
  pickRate?: number | null;
};

type Props = {
  formation: FormationDef;
  starters: (CommunityStarter | null)[];
  bench?: (CommunityStarter | null)[];
  showPhotos?: boolean;
  lastNameOnly?: boolean;
};

function toPkgPlayer(
  p: CommunityStarter | null,
  showPhotos: boolean,
  shortenName: boolean,
  showPickRateInExtras: boolean,
): PkgPlayer | null {
  if (!p) return null;
  const extras: Record<string, string | number> = {};
  if (p.age != null) extras["Age"] = p.age;
  if (p.marketValueEur != null) extras["Value"] = formatEur(p.marketValueEur);
  if (p.club) extras["Club"] = p.club;
  if (showPickRateInExtras && p.pickRate != null) {
    extras["% Picked"] = `${Math.round(p.pickRate * 100)}%`;
  }
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

// Pill at top-right of each avatar showing "% picked". Uses ::before since the
// flag override already occupies ::after on .sp-aspect-square.
function pickRateBadgeCSS(
  scope: string,
  starters: (CommunityStarter | null)[],
  bench: (CommunityStarter | null)[] | undefined,
): string {
  const rules: string[] = [];

  const badge = (sel: string, pct: number) => `${sel}::before {
    content: "${pct}%";
    position: absolute;
    top: -8%;
    right: -10%;
    background: #fff;
    color: #111;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 9999px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    pointer-events: none;
    z-index: 2;
    white-space: nowrap;
  }`;

  starters.forEach((p, i) => {
    if (p?.pickRate == null) return;
    const pct = Math.round(p.pickRate * 100);
    const sel = `.${scope} .sp-soccer-pitch > .sp-relative > .sp-absolute.sp-inset-0:last-child > :nth-child(${i + 1}) .sp-aspect-square`;
    rules.push(badge(sel, pct));
  });

  bench?.forEach((p, i) => {
    if (p?.pickRate == null) return;
    const pct = Math.round(p.pickRate * 100);
    const sel = `.${scope} .sp-bench-row > .sp-absolute > :nth-child(${i + 1}) .sp-aspect-square`;
    rules.push(badge(sel, pct));
  });

  return rules.join("\n");
}

export function CommunityPitch({
  formation,
  starters,
  bench,
  showPhotos = true,
  lastNameOnly = false,
}: Props) {
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
  const shortenName = lastNameOnly || isNarrow;
  const pkgPlayers = starters.map((p) =>
    toPkgPlayer(p, showPhotos, shortenName, isNarrow),
  );
  const pkgBench = bench?.map((p) =>
    toPkgPlayer(p, showPhotos, shortenName, isNarrow),
  );

  const overrideCSS = flagOverrideCSS(scopeClass, starters, bench);
  const badgeCSS = !isNarrow ? pickRateBadgeCSS(scopeClass, starters, bench) : "";
  const clampCSS = hoverCardClampCSS(
    scopeClass,
    formation.slots.map((s) => s.x),
    bench?.length ?? 0,
  );

  return (
    <div className={scopeClass}>
      {overrideCSS && <style>{overrideCSS}</style>}
      {badgeCSS && <style>{badgeCSS}</style>}
      <style>{clampCSS}</style>
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
