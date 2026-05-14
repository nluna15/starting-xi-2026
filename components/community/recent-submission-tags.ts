import type { Player } from "@/lib/db/schema";
import { lastName } from "@/lib/utils";

export const MIN_TEAM_SUBS_FOR_BADGE = 5;
export const BOLD_PICK_RATE = 0.2;
// A "conventional" player is one most fans feature. Used as the floor for the
// missing-player half of a bold-pick swap tag — the contrast only reads as a
// hot take when the displaced player is meaningfully more popular than the
// bold inclusion (≥ 2× BOLD_PICK_RATE).
export const CONVENTIONAL_PICK_RATE = 0.4;
// THROWBACK fires when at least THROWBACK_OLD_STARTER_COUNT of 11 starters are
// strictly older than THROWBACK_OLD_STARTER_AGE. Counting individuals reads
// more cleanly than "average age ≥ X" — a single 38-year-old can no longer
// drag the whole XI into the badge.
export const THROWBACK_OLD_STARTER_AGE = 29;
export const THROWBACK_OLD_STARTER_COUNT = 8;
// HATCHLINGS is THROWBACK's mirror: the average age of the starting XI is
// strictly below HATCHLINGS_AVG_AGE.
export const HATCHLINGS_AVG_AGE = 24.5;

export type BadgeKind =
  | "FRESH"
  | "CONSENSUS"
  | "TACTICAL"
  | "HOT TAKE"
  | "CONTROVERSIAL"
  | "THROWBACK"
  | "HATCHLINGS";

export const BADGE_COLORS: Record<BadgeKind, string> = {
  FRESH: "#22c55e",
  CONSENSUS: "#2563eb",
  TACTICAL: "#1e3a2f",
  "HOT TAKE": "#dc2626",
  CONTROVERSIAL: "#c2410c",
  THROWBACK: "#92400e",
  HATCHLINGS: "#7c3aed",
};

export const BADGE_DEFINITIONS: Record<BadgeKind, string> = {
  FRESH: "Among the first submissions for this team.",
  THROWBACK: "Eight or more starters are older than 29.",
  HATCHLINGS: "Starting XI averages under 24.5 years old.",
  CONSENSUS: "Plays the team's most-picked formation with no bold starters.",
  TACTICAL: "Unconventional formation, but every starter is a fan favorite.",
  CONTROVERSIAL: "Unconventional formation with at least one bold starter.",
  "HOT TAKE": "Unconventional formation with three or more bold starters.",
};

export type DeviationTag =
  | { kind: "formation"; from: string; to: string }
  | { kind: "swap"; from: string; to: string };

function avgAge(starters: Player[]): number {
  if (starters.length === 0) return 0;
  return starters.reduce((s, p) => s + p.age, 0) / starters.length;
}

function oldStarterCount(starters: Player[]): number {
  return starters.filter((p) => p.age > THROWBACK_OLD_STARTER_AGE).length;
}

// Only the slice of RecentSubmission that categorize() actually reads. Lets
// callers compute a badge for a freshly-saved submission without needing to
// hydrate the full feed-row shape (modeStarterBySlot, popularPlayers, etc.).
export type CategorizeInput = {
  starters: Player[];
  formation: { name: string };
  teamTopFormation: string | null;
  teamTotalSubmissions: number;
  teamPickRates: Map<number, number>;
};

function boldStarterCount(submission: CategorizeInput): number {
  let count = 0;
  for (const p of submission.starters) {
    const rate = submission.teamPickRates.get(p.id) ?? 0;
    if (rate < BOLD_PICK_RATE) count++;
  }
  return count;
}

export function categorize(submission: CategorizeInput): { badge: BadgeKind } {
  if (submission.teamTotalSubmissions < MIN_TEAM_SUBS_FOR_BADGE) {
    return { badge: "FRESH" };
  }

  if (oldStarterCount(submission.starters) >= THROWBACK_OLD_STARTER_COUNT) {
    return { badge: "THROWBACK" };
  }

  if (avgAge(submission.starters) < HATCHLINGS_AVG_AGE) {
    return { badge: "HATCHLINGS" };
  }

  const formationDiffers = Boolean(
    submission.teamTopFormation && submission.teamTopFormation !== submission.formation.name,
  );
  const bold = boldStarterCount(submission);

  if (formationDiffers && bold >= 3) return { badge: "HOT TAKE" };
  if (formationDiffers && bold >= 1) return { badge: "CONTROVERSIAL" };
  if (formationDiffers && bold === 0) return { badge: "TACTICAL" };
  if (!formationDiffers && bold === 0) return { badge: "CONSENSUS" };
  return { badge: "CONTROVERSIAL" };
}

const MAX_SWAP_TAGS = 2;

// Same fields `deviationTags` actually reads. `RecentSubmission` is a
// superset, so existing callers still satisfy the contract; surfaces that
// build a deviation list outside the feed (e.g. the lineup page) can pass this
// narrower shape without inventing the rest of `RecentSubmission`.
export type DeviationInput = {
  starters: Player[];
  bench: Player[];
  formation: { name: string };
  teamTopFormation: string | null;
  teamTotalSubmissions: number;
  teamPickRates: Map<number, number>;
  teamPopularPlayers: Player[];
};

// Pairs each bold starter (rate < BOLD_PICK_RATE) with the highest-rate
// "conventional" player at the same broad position who is missing from this
// submission entirely (starters + bench). Each missing player is consumed by
// at most one swap so two bold FWDs don't both point at the same Salah.
export function deviationTags(submission: DeviationInput): DeviationTag[] {
  const tags: DeviationTag[] = [];
  const formationDiffers = Boolean(
    submission.teamTopFormation && submission.teamTopFormation !== submission.formation.name,
  );

  if (formationDiffers && submission.teamTopFormation) {
    tags.push({
      kind: "formation",
      from: submission.teamTopFormation,
      to: submission.formation.name,
    });
  }

  if (submission.teamTotalSubmissions < MIN_TEAM_SUBS_FOR_BADGE) {
    return tags;
  }

  const includedIds = new Set<number>();
  for (const p of submission.starters) includedIds.add(p.id);
  for (const p of submission.bench) includedIds.add(p.id);

  const boldStarters = submission.starters
    .map((p) => ({ player: p, rate: submission.teamPickRates.get(p.id) ?? 0 }))
    .filter(({ rate }) => rate < BOLD_PICK_RATE)
    .sort((a, b) => a.rate - b.rate);

  const missingConventional = submission.teamPopularPlayers.filter((p) => {
    if (includedIds.has(p.id)) return false;
    const rate = submission.teamPickRates.get(p.id) ?? 0;
    return rate >= CONVENTIONAL_PICK_RATE;
  });

  const usedMissing = new Set<number>();
  for (const { player: bold } of boldStarters) {
    if (tags.filter((t) => t.kind === "swap").length >= MAX_SWAP_TAGS) break;
    const match = missingConventional.find(
      (m) => m.position === bold.position && !usedMissing.has(m.id),
    );
    if (!match) continue;
    usedMissing.add(match.id);
    tags.push({
      kind: "swap",
      from: lastName(match.fullName),
      to: lastName(bold.fullName),
    });
  }

  return tags;
}
