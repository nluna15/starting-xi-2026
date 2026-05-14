"use client";

import * as React from "react";
import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { FormationDef } from "@/lib/formations";
import type { Player } from "@/lib/db/schema";
import { hoverCardClampCSS } from "@/lib/pitch-hover-clamp";
import {
  formatEur,
  initialPlusLastName,
  lastName,
  proxyPhotoUrl,
  useMediaQuery,
} from "@/lib/utils";

type NameFormat = "full" | "lastOnly" | "initialPlusLast";

function formatPlayerName(fullName: string, mode: NameFormat): string {
  if (mode === "lastOnly") return lastName(fullName);
  if (mode === "initialPlusLast") return initialPlusLastName(fullName);
  return fullName;
}

type ActiveBlank =
  | { kind: "starter"; index: number }
  | { kind: "bench"; index: number; total: number };

export type PitchPickCategory = "conventional" | "debated" | "bold";

const CATEGORY_EMOJI: Record<PitchPickCategory, string> = {
  bold: "🔴",
  debated: "🟡",
  conventional: "🟢",
};

type Props = {
  formation: FormationDef;
  starters: (Player | null)[];
  bench?: (Player | null)[];
  onSlotClick?: (slotIndex: number) => void;
  onBenchClick?: (slotIndex: number) => void;
  /** Index of the active starter slot — drawn as a non-blocking accent ring. */
  highlightSlot?: number | null;
  /**
   * The next blank spot the user will fill. Styled with an accent dotted outline
   * and accent-tinted avatar via scoped CSS variable injection.
   */
  activeBlank?: ActiveBlank | null;
  showPhotos?: boolean;
  /**
   * Show a hover card with age, market value, caps, and current club. Opt-in
   * because the builder UI uses hover for slot interaction.
   */
  showPlayerDetails?: boolean;
  /** Force last-name-only labels regardless of viewport width. */
  shortenNames?: boolean;
  /**
   * When the viewport is wider than 410px, render names as "F. Lastname"
   * instead of the full first name. Narrow viewports still collapse to
   * last-name-only via the existing `isNarrow` path.
   */
  useFirstInitial?: boolean;
  /** Fixed avatar size in pixels. Overrides the package's responsive clamp. */
  avatarSize?: number;
  /** Gap in pixels between avatar bottom and name label. Default is 8px (sp-mt-2). */
  avatarNameGap?: number;
  /**
   * Map of player id → crowd-pick category. When provided, prepends a colored
   * dot (🟢 / 🟡 / 🔴) to the player's display name on the pitch and bench.
   */
  playerCategories?: Map<number, PitchPickCategory>;
};

// Pull the design-system accent into the pitch package's slot ring + avatar
// fill. The pitch package uses `--sp-player-ring` for both the dotted blank
// outline and the slot label color; we inject `var(--accent)` so the active
// blank visually agrees with the rest of the surface. The avatar background
// fades to a tinted accent at ~25% opacity (matched to `--accent-soft`'s
// visual weight without a literal rgba).
function toPkgPlayer(
  p: Player | null,
  showPhotos: boolean,
  nameFormat: NameFormat,
  withDetails: boolean,
  category?: PitchPickCategory,
): PkgPlayer | null {
  if (!p) return null;
  const extras: Record<string, string | number> | undefined = withDetails
    ? {
        Age: p.age,
        Value: formatEur(p.marketValueEur),
        Caps: p.internationalCaps ?? "—",
        Club: p.club,
      }
    : undefined;
  const baseName = formatPlayerName(p.fullName, nameFormat);
  const name = category ? `${CATEGORY_EMOJI[category]} ${baseName}` : baseName;
  return {
    id: String(p.id),
    name,
    photoUrl: showPhotos ? proxyPhotoUrl(p.photoUrl) : undefined,
    extras,
  };
}

/**
 * Generates scoped CSS that highlights a specific blank slot.
 *
 * The pitch package sets inline styles on the inner `.sp-rounded-full`:
 *   - `outline: 2px dotted var(--sp-player-ring)` (the blank ring)
 *   - `background: rgba(0,0,0,0.25)` (the dim fill)
 * and an inline `color: #ffffff` on the role-label span. To make the active
 * blank stand out we:
 *   1. Set `--sp-player-ring` on the outer slot (cascades inward).
 *   2. Override outline with a solid 4px ring (2× the default thickness).
 *   3. Tint the background with `--accent-soft`.
 *   4. Recolor the role label (e.g. "GK") to the accent red.
 * `!important` is required to beat the package's inline styles.
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
function avatarSizeCSS(scope: string, px: number): string {
  return `
    .${scope} .sp-soccer-pitch .sp-aspect-square {
      width: ${px}px !important;
    }
  `;
}

function avatarNameGapCSS(scope: string, px: number): string {
  return `
    .${scope} .sp-soccer-pitch .sp-top-full {
      margin-top: ${px}px !important;
    }
  `;
}

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
    ${slotSel} { --sp-player-ring: var(--accent); }
    ${slotSel} .sp-rounded-full {
      background: color-mix(in srgb, var(--accent-soft) 75%, transparent) !important;
      outline: 4px solid var(--accent) !important;
    }
    ${slotSel} .sp-rounded-full > span { color: var(--accent) !important; }
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
  showPlayerDetails = false,
  shortenNames = false,
  useFirstInitial = false,
  avatarSize,
  avatarNameGap,
  playerCategories,
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
  const categoryFor = (p: Player | null) =>
    p ? playerCategories?.get(p.id) : undefined;
  const nameFormat: NameFormat =
    isNarrow || shortenNames
      ? "lastOnly"
      : useFirstInitial
        ? "initialPlusLast"
        : "full";
  const pkgPlayers = starters.map((p) =>
    toPkgPlayer(p, showPhotos, nameFormat, showPlayerDetails, categoryFor(p)),
  );
  const pkgBench = bench?.map((p) =>
    toPkgPlayer(p, showPhotos, nameFormat, showPlayerDetails, categoryFor(p)),
  );
  const hl = highlightSlot != null ? formation.slots[highlightSlot] ?? null : null;

  return (
    <div className={`relative ${scopeClass}`}>
      {avatarSize != null && (
        <style>{avatarSizeCSS(scopeClass, avatarSize)}</style>
      )}
      {avatarNameGap != null && (
        <style>{avatarNameGapCSS(scopeClass, avatarNameGap)}</style>
      )}
      {activeBlank && (
        <style>{blankHighlightCSS(scopeClass, activeBlank)}</style>
      )}
      {showPlayerDetails && (
        <style>
          {hoverCardClampCSS(
            scopeClass,
            formation.slots.map((s) => s.x),
            bench?.length ?? 0,
          )}
        </style>
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
