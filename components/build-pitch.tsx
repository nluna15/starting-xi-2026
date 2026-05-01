"use client";

import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";
import type { Player } from "@/lib/db/schema";

type Props = {
  formation: FormationDef;
  starters: (Player | null)[];
  bench?: (Player | null)[];
  onSlotClick?: (slotIndex: number) => void;
  onBenchClick?: (slotIndex: number) => void;
  highlightSlot?: number | null;
  showPhotos?: boolean;
};

function toPkgPlayer(p: Player | null, showPhotos: boolean): PkgPlayer | null {
  if (!p) return null;
  return {
    id: String(p.id),
    name: p.fullName,
    photoUrl: showPhotos ? p.photoUrl ?? undefined : undefined,
  };
}

export function BuildPitch({
  formation,
  starters,
  bench,
  onSlotClick,
  onBenchClick,
  highlightSlot = null,
  showPhotos = false,
}: Props) {
  const pkgFormation = {
    name: formation.name,
    slots: formation.slots.map((s) => ({
      x: s.x,
      y: 100 - s.y,
      role: s.slot,
    })),
  };
  const pkgPlayers = starters.map((p) => toPkgPlayer(p, showPhotos));
  const pkgBench = bench?.map((p) => toPkgPlayer(p, showPhotos));
  const hl = highlightSlot != null ? formation.slots[highlightSlot] ?? null : null;

  return (
    <div className="relative">
      <SoccerPitch
        formation={pkgFormation}
        players={pkgPlayers}
        bench={pkgBench}
        theme="grass"
        showNames
        showFlags={false}
        onSlotToggle={onSlotClick}
        onBenchToggle={onBenchClick}
      />
      {hl && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 h-[98px] w-[98px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-accent ring-offset-2 ring-offset-transparent sm:h-[112px] sm:w-[112px]"
          style={{ left: `${hl.x}%`, top: `${100 - hl.y}%` }}
        />
      )}
    </div>
  );
}
