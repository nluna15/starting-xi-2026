"use client";

import * as React from "react";
import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";
import type { Player } from "@/lib/db/schema";
import { lastName, useMediaQuery } from "@/lib/utils";

type ActiveBlank =
  | { kind: "starter"; index: number }
  | { kind: "bench"; index: number; total: number };

type Props = {
  formation: FormationDef;
  starters: (Player | null)[];
  bench?: (Player | null)[];
  onSlotClick?: (slotIndex: number) => void;
  onBenchClick?: (slotIndex: number) => void;
  /** Index of the active starter slot — drawn as a non-blocking accent ring. */
  highlightSlot?: number | null;
  /**
   * The next blank spot the user will fill. Styled with a red dotted outline
   * and red 25%-opacity avatar via scoped CSS variable injection.
   */
  activeBlank?: ActiveBlank | null;
  showPhotos?: boolean;
};

const HIGHLIGHT_RED = "#dc2626";
const HIGHLIGHT_RED_25 = "rgba(220, 38, 38, 0.25)";

function toPkgPlayer(
  p: Player | null,
  showPhotos: boolean,
  shortenName: boolean,
): PkgPlayer | null {
  if (!p) return null;
  return {
    id: String(p.id),
    name: shortenName ? lastName(p.fullName) : p.fullName,
    photoUrl: showPhotos ? p.photoUrl ?? undefined : undefined,
  };
}

/**
 * Generates scoped CSS that highlights a specific blank slot.
 *
 * Blank slots use `var(--sp-player-ring)` for both their dotted outline and
 * label color, and set `background: transparent` as an inline style on the
 * inner `.sp-rounded-full` div.  We override both by:
 *   1. Setting `--sp-player-ring` on the slot's outer element (cascades inward).
 *   2. Using `!important` to beat the inline background.
 *
 * Pitch slot structure (relevant path):
 *   .sp-soccer-pitch
 *     > .sp-relative          (pitch area)
 *       > .sp-absolute.sp-inset-0:last-child   (slot container — 2nd child)
 *         > :nth-child(N)     (slot at formation index N-1)
 *
 * Bench slot structure:
 *   .sp-bench-row
 *     > :nth-child(M)         (bench slot at index M-1)
 */
function blankHighlightCSS(scope: string, blank: ActiveBlank): string {
  const n = blank.index + 1; // nth-child is 1-indexed

  let slotSel: string;
  if (blank.kind === "starter") {
    slotSel = `.${scope} .sp-soccer-pitch > .sp-relative > .sp-absolute.sp-inset-0:last-child > :nth-child(${n})`;
  } else {
    // Bench slots are grandchildren: .sp-bench-row > div.sp-absolute > :nth-child(n)
    slotSel = `.${scope} .sp-bench-row > .sp-absolute > :nth-child(${n})`;
  }

  return `
    ${slotSel} { --sp-player-ring: ${HIGHLIGHT_RED}; }
    ${slotSel} .sp-rounded-full { background: ${HIGHLIGHT_RED_25} !important; }
  `;
}

export function BuildPitch({
  formation,
  starters,
  bench,
  onSlotClick,
  onBenchClick,
  highlightSlot = null,
  activeBlank = null,
  showPhotos = false,
}: Props) {
  const isNarrow = useMediaQuery("(max-width: 410px)");

  // Unique scope class so the injected CSS doesn't bleed to other pitch instances.
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
  const hl = highlightSlot != null ? formation.slots[highlightSlot] ?? null : null;

  return (
    <div className={`relative ${scopeClass}`}>
      {activeBlank && (
        <style>{blankHighlightCSS(scopeClass, activeBlank)}</style>
      )}
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
      {/* Accent ring on the actively-selected filled slot. Suppressed when the
          active slot is itself the next blank (the red highlight takes over). */}
      {hl &&
        !(
          activeBlank?.kind === "starter" &&
          highlightSlot != null &&
          activeBlank.index === highlightSlot
        ) && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 h-[98px] w-[98px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-accent ring-offset-2 ring-offset-transparent max-[410px]:h-[49px] max-[410px]:w-[49px] sm:h-[112px] sm:w-[112px]"
            style={{ left: `${hl.x}%`, top: `${100 - hl.y}%` }}
          />
        )}
    </div>
  );
}
