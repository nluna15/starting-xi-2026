"use client";

import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";
import { lastName, useMediaQuery } from "@/lib/utils";

export type CommunityStarter = {
  id: number;
  fullName: string;
  photoUrl?: string | null;
  countryCode?: string | null;
};

type Props = {
  formation: FormationDef;
  starters: (CommunityStarter | null)[];
  showPhotos?: boolean;
};

function toPkgPlayer(
  p: CommunityStarter | null,
  showPhotos: boolean,
  shortenName: boolean,
): PkgPlayer | null {
  if (!p) return null;
  return {
    id: String(p.id),
    name: shortenName ? lastName(p.fullName) : p.fullName,
    photoUrl: showPhotos ? p.photoUrl ?? undefined : undefined,
    countryCode: p.countryCode ?? undefined,
  };
}

export function CommunityPitch({ formation, starters, showPhotos = true }: Props) {
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

  return (
    <SoccerPitch
      formation={pkgFormation}
      players={pkgPlayers}
      theme="grass"
      showNames
      showFlags
    />
  );
}
