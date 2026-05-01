"use client";

import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";

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

function toPkgPlayer(p: CommunityStarter | null, showPhotos: boolean): PkgPlayer | null {
  if (!p) return null;
  return {
    id: String(p.id),
    name: p.fullName,
    photoUrl: showPhotos ? p.photoUrl ?? undefined : undefined,
    countryCode: p.countryCode ?? undefined,
  };
}

export function CommunityPitch({ formation, starters, showPhotos = true }: Props) {
  const pkgFormation = {
    name: formation.name,
    slots: formation.slots.map((s) => ({
      x: s.x,
      y: 100 - s.y,
      role: s.slot,
    })),
  };
  const pkgPlayers = starters.map((p) => toPkgPlayer(p, showPhotos));

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
