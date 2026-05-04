"use client";

import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";
import { formatEur, lastName, useMediaQuery } from "@/lib/utils";

export type CommunityStarter = {
  id: number;
  fullName: string;
  photoUrl?: string | null;
  countryCode?: string | null;
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

export function CommunityPitch({ formation, starters, bench, showPhotos = true }: Props) {
  const isNarrow = useMediaQuery("(max-width: 410px)");
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

  return (
    <SoccerPitch
      formation={pkgFormation}
      players={pkgPlayers}
      bench={pkgBench}
      theme="grass"
      showNames
      showFlags
    />
  );
}
