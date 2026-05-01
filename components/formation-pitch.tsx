"use client";

import * as React from "react";
import type { FormationDef } from "@/lib/formations";
import type { Player, FormationSlot } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Props = {
  formation: FormationDef;
  starters: (Player | null)[];
  onSlotClick?: (slotIndex: number) => void;
  highlightSlot?: number | null;
  showInitials?: boolean;
  readOnly?: boolean;
  pickRates?: number[];
  showPhotos?: boolean;
};

export function FormationPitch({
  formation,
  starters,
  onSlotClick,
  highlightSlot = null,
  showInitials = true,
  readOnly = false,
  pickRates,
  showPhotos = false,
}: Props) {
  return (
    <div className="relative aspect-[9/8] w-full">
      <div className="absolute inset-0 overflow-hidden rounded-xl border border-emerald-900/40 bg-gradient-to-b from-emerald-700 to-emerald-800 shadow-inner [clip-path:polygon(12%_0%,88%_0%,100%_100%,0%_100%)]">
        <PitchMarkings />
      </div>
      <div className="absolute inset-0">
        {formation.slots.map((slot, i) => (
          <SlotMarker
            key={`${slot.slot}-${i}`}
            slot={slot}
            player={starters[i] ?? null}
            highlight={highlightSlot === i}
            onClick={readOnly ? undefined : () => onSlotClick?.(i)}
            showInitials={showInitials}
            pickRate={pickRates?.[i]}
            showPhotos={showPhotos}
          />
        ))}
      </div>
    </div>
  );
}

function PitchMarkings() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white/40"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect x="2" y="2" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="0.4" />
      <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" strokeWidth="0.4" />
      <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="0.4" />
      <rect x="25" y="2" width="50" height="14" fill="none" stroke="currentColor" strokeWidth="0.4" />
      <rect x="38" y="2" width="24" height="6" fill="none" stroke="currentColor" strokeWidth="0.4" />
      <rect x="25" y="84" width="50" height="14" fill="none" stroke="currentColor" strokeWidth="0.4" />
      <rect x="38" y="92" width="24" height="6" fill="none" stroke="currentColor" strokeWidth="0.4" />
    </svg>
  );
}

function SlotMarker({
  slot,
  player,
  highlight,
  onClick,
  showInitials,
  pickRate,
  showPhotos,
}: {
  slot: FormationSlot;
  player: Player | null;
  highlight?: boolean;
  onClick?: () => void;
  showInitials?: boolean;
  pickRate?: number;
  showPhotos?: boolean;
}) {
  const initials = player ? getInitials(player.fullName) : null;
  const last = player ? getLastName(player.fullName) : slot.slot;
  const usePhoto = showPhotos && player?.photoUrl;
  const jerseyNumber = player?.jerseyNumber ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        left: `${slot.x}%`,
        top: `${100 - slot.y}%`,
      }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition focus:outline-none",
        onClick && "hover:scale-105 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-700",
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full border-2 text-sm font-semibold shadow-md sm:h-[98px] sm:w-[98px] sm:text-base",
            player
              ? "border-white bg-white text-emerald-900"
              : "border-white/60 border-dashed bg-emerald-900/40 text-white",
            highlight && "ring-2 ring-accent ring-offset-2 ring-offset-emerald-700",
          )}
        >
          {usePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player!.photoUrl!}
              alt={player!.fullName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : showInitials && player ? (
            initials
          ) : (
            slot.slot
          )}
        </div>
        {jerseyNumber != null && (
          <span
            className={cn(
              "pointer-events-none absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-900 bg-white text-[10px] font-bold leading-none text-emerald-900 shadow-sm",
              "sm:-top-1.5 sm:-right-1.5 sm:h-5 sm:w-5",
            )}
          >
            {jerseyNumber}
          </span>
        )}
      </div>
      <div className="pointer-events-none mt-1 max-w-[72px] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white sm:max-w-[88px] sm:text-xs">
        {last}
      </div>
      {pickRate != null && pickRate > 0 && (
        <div className="pointer-events-none mt-0.5 rounded bg-yellow-300/90 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-emerald-950">
          {Math.round(pickRate * 100)}%
        </div>
      )}
    </button>
  );
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getLastName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}
