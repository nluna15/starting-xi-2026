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

const POSITION_COLORS = {
  GK:  { avatar: "bg-amber-400 text-amber-950",  ring: "ring-amber-300",    label: "bg-amber-400/90 text-amber-950" },
  DEF: { avatar: "bg-sky-500 text-white",         ring: "ring-sky-300",      label: "bg-sky-500/90 text-white" },
  MID: { avatar: "bg-violet-500 text-white",      ring: "ring-violet-300",   label: "bg-violet-500/90 text-white" },
  FWD: { avatar: "bg-rose-500 text-white",        ring: "ring-rose-300",     label: "bg-rose-500/90 text-white" },
} as const;

type PositionKey = keyof typeof POSITION_COLORS;

function positionColors(position: string) {
  return POSITION_COLORS[(position as PositionKey) in POSITION_COLORS ? (position as PositionKey) : "MID"];
}

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
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-black/20">
      <div className="absolute inset-0 bg-emerald-700" />
      <PitchMarkings />
      {/* Vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.30) 100%)",
        }}
      />
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
  );
}

function PitchMarkings() {
  const c = "rgba(255,255,255,0.5)";
  const sw = 0.5;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 75 100"
      aria-hidden
    >
      <defs>
        <pattern id="grass-stripe" x="0" y="0" width="75" height="10" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="75" height="5" fill="rgba(0,0,0,0.06)" />
          <rect x="0" y="5" width="75" height="5" fill="transparent" />
        </pattern>
      </defs>

      {/* Alternating grass stripes */}
      <rect x="0" y="0" width="75" height="100" fill="url(#grass-stripe)" />

      {/* Pitch border */}
      <rect x="3" y="3" width="69" height="94" fill="none" stroke={c} strokeWidth={sw} />

      {/* Halfway line */}
      <line x1="3" y1="50" x2="72" y2="50" stroke={c} strokeWidth={sw} />

      {/* Center circle + spot */}
      <circle cx="37.5" cy="50" r="9.15" fill="none" stroke={c} strokeWidth={sw} />
      <circle cx="37.5" cy="50" r="0.8" fill={c} />

      {/* ── Top end (attacking) ── */}
      {/* Penalty area */}
      <rect x="17.5" y="3" width="40" height="16.5" fill="none" stroke={c} strokeWidth={sw} />
      {/* 6-yard box */}
      <rect x="28.5" y="3" width="18" height="5.5" fill="none" stroke={c} strokeWidth={sw} />
      {/* Penalty spot */}
      <circle cx="37.5" cy="14" r="0.8" fill={c} />
      {/* Penalty arc (portion outside the box) */}
      <path d="M 30.19 19.5 A 9.15 9.15 0 0 1 44.81 19.5" fill="none" stroke={c} strokeWidth={sw} />
      {/* Goal */}
      <rect x="32" y="1" width="11" height="2.5" fill="none" stroke={c} strokeWidth={sw} />

      {/* ── Bottom end (defensive) ── */}
      {/* Penalty area */}
      <rect x="17.5" y="80.5" width="40" height="16.5" fill="none" stroke={c} strokeWidth={sw} />
      {/* 6-yard box */}
      <rect x="28.5" y="91.5" width="18" height="5.5" fill="none" stroke={c} strokeWidth={sw} />
      {/* Penalty spot */}
      <circle cx="37.5" cy="86" r="0.8" fill={c} />
      {/* Penalty arc */}
      <path d="M 30.19 80.5 A 9.15 9.15 0 0 0 44.81 80.5" fill="none" stroke={c} strokeWidth={sw} />
      {/* Goal */}
      <rect x="32" y="96.5" width="11" height="2.5" fill="none" stroke={c} strokeWidth={sw} />

      {/* Corner arcs */}
      <path d="M 3 5.5 A 2.5 2.5 0 0 1 5.5 3" fill="none" stroke={c} strokeWidth={sw} />
      <path d="M 69.5 3 A 2.5 2.5 0 0 1 72 5.5" fill="none" stroke={c} strokeWidth={sw} />
      <path d="M 5.5 97 A 2.5 2.5 0 0 1 3 94.5" fill="none" stroke={c} strokeWidth={sw} />
      <path d="M 72 94.5 A 2.5 2.5 0 0 1 69.5 97" fill="none" stroke={c} strokeWidth={sw} />
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
  const colors = positionColors(slot.position);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-transform focus:outline-none",
        onClick && "cursor-pointer hover:scale-110 focus:scale-110",
        !onClick && "cursor-default",
      )}
    >
      {/* Position badge — only shown when a player is assigned */}
      {player && (
        <span
          className={cn(
            "rounded px-1.5 py-px text-[8px] font-bold uppercase tracking-widest shadow-sm",
            colors.label,
          )}
        >
          {slot.position}
        </span>
      )}

      {/* Avatar circle */}
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-bold shadow-lg transition sm:h-12 sm:w-12 sm:text-sm",
          player
            ? cn(
                usePhoto ? "border-white/80 bg-zinc-800" : cn("border-white/60", colors.avatar),
                highlight
                  ? "ring-2 ring-yellow-300 ring-offset-1 ring-offset-transparent"
                  : cn("ring-2 ring-offset-1 ring-offset-transparent", colors.ring),
              )
            : "border-dashed border-white/40 bg-black/20 text-white/50",
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
          <span className="text-[9px] font-semibold">{slot.slot}</span>
        )}
      </div>

      {/* Name label */}
      <div className="pointer-events-none max-w-[72px] truncate rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold leading-tight text-white shadow backdrop-blur-sm sm:max-w-[88px] sm:text-[11px]">
        {last}
      </div>

      {/* Pick rate badge */}
      {pickRate != null && pickRate > 0 && (
        <div className="pointer-events-none rounded-full bg-yellow-300/95 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-emerald-950 shadow-sm">
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
