// Static draw for the 2026 FIFA World Cup group stage.
//
// Twelve groups of four. Codes are FIFA 3-letter codes matching
// `WC_2026_SLOTS` in `wc-2026-teams.ts`. The seeded order within each group
// reflects how foxsports.com/soccer/fifa-world-cup/standings lists the pots
// (pot 1 first), which is also the order group pages should render until
// matches start producing real standings.
//
// This draw is final — do not mutate at runtime.

import { WC_2026_SLOTS, type WcSlot } from "./wc-2026-teams";

export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export const GROUP_LETTERS: readonly GroupLetter[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

export const WC_2026_GROUPS: Record<GroupLetter, readonly string[]> = {
  A: ["MEX", "RSA", "KOR", "CZE"],
  B: ["CAN", "BIH", "QAT", "SUI"],
  C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"],
  E: ["GER", "CUW", "CIV", "ECU"],
  F: ["NED", "JPN", "SWE", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "CPV", "KSA", "URU"],
  I: ["FRA", "SEN", "IRQ", "NOR"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "COD", "UZB", "COL"],
  L: ["ENG", "CRO", "GHA", "PAN"],
} as const;

const GROUP_BY_CODE: Record<string, GroupLetter> = (() => {
  const map: Record<string, GroupLetter> = {};
  for (const letter of GROUP_LETTERS) {
    for (const code of WC_2026_GROUPS[letter]) {
      map[code] = letter;
    }
  }
  return map;
})();

// Returns the group letter for a confirmed team, or null for codes that
// aren't in the draw (shouldn't happen for confirmed slots — all 48 are
// assigned).
export function groupOf(code: string): GroupLetter | null {
  return GROUP_BY_CODE[code] ?? null;
}

// The other three codes in the same group as `code`, in the same order they
// appear in `WC_2026_GROUPS`. Empty array if `code` isn't in the draw.
export function groupmatesOf(code: string): readonly string[] {
  const letter = GROUP_BY_CODE[code];
  if (!letter) return [];
  return WC_2026_GROUPS[letter].filter((c) => c !== code);
}

// Resolves a group letter to the full WcSlot entries (name, flag, etc.)
// from the team manifest, preserving the seeded order. Throws if any code
// in the group isn't a confirmed slot — the draw and manifest are both
// frozen, so a miss means one of the two files drifted.
export function groupSlots(letter: GroupLetter): WcSlot[] {
  return WC_2026_GROUPS[letter].map((code) => {
    const slot = WC_2026_SLOTS.find(
      (s) => s.kind === "confirmed" && s.code === code,
    );
    if (!slot) {
      throw new Error(
        `wc-2026-groups: group ${letter} references unknown code ${code}`,
      );
    }
    return slot;
  });
}
