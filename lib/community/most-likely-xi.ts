import type { FormationSlot, Player } from "@/lib/db/schema";
import { DETAILED_BY_BROAD, SLOT_TO_DETAILED, type BroadPosition } from "@/lib/formations";

export type PlayerPickEntry = {
  playerId: number;
  detailedPosition: string;
  picks: number;
};

export type MostLikelyXiSlot = {
  slot: string;
  position: string;
  x: number;
  y: number;
  player: Player | null;
  pickRate: number;
};

type SlotFit = {
  score: number;
  exact: number;
  compatible: number;
};

type SlotProfile = {
  idx: number;
  slot: FormationSlot;
  detailed: string;
  broad: BroadPosition;
};

const EXACT_WEIGHT = 1.0;
const BROAD_WEIGHT = 0.5;

function fit(
  profile: SlotProfile,
  playerPicks: ReadonlyMap<string, number>,
): SlotFit {
  const exact = playerPicks.get(profile.detailed) ?? 0;

  if (profile.broad === "GK") {
    return { score: exact * EXACT_WEIGHT, exact, compatible: exact };
  }

  let broadOther = 0;
  for (const d of DETAILED_BY_BROAD[profile.broad]) {
    if (d === profile.detailed) continue;
    broadOther += playerPicks.get(d) ?? 0;
  }

  return {
    score: exact * EXACT_WEIGHT + broadOther * BROAD_WEIGHT,
    exact,
    compatible: exact + broadOther,
  };
}

// Greedy fill in a stable order:
//   1. GK first — it can't fall back to outfield candidates, so resolve it up front.
//   2. Then slots with the strongest exact-position candidate first (descending max-exact).
//      This protects a slot like LCB (a player with many CB picks) from losing that player
//      to an LB slot that would have only claimed them via the half-weight broad fallback.
//   3. Ties broken by fewer total eligible candidates (more constrained), then by slot index.
function fillOrder(
  profiles: readonly SlotProfile[],
  maxExact: ReadonlyMap<number, number>,
  candidateCounts: ReadonlyMap<number, number>,
): SlotProfile[] {
  return [...profiles].sort((a, b) => {
    const aGk = a.broad === "GK" ? 0 : 1;
    const bGk = b.broad === "GK" ? 0 : 1;
    if (aGk !== bGk) return aGk - bGk;
    const ax = maxExact.get(a.idx) ?? 0;
    const bx = maxExact.get(b.idx) ?? 0;
    if (ax !== bx) return bx - ax;
    const ac = candidateCounts.get(a.idx) ?? 0;
    const bc = candidateCounts.get(b.idx) ?? 0;
    if (ac !== bc) return ac - bc;
    return a.idx - b.idx;
  });
}

// Pure helper. Builds the community most-likely XI by mapping the
// most-popular formation onto cross-formation player picks, using each
// slot's detailed position with a half-weight broad-category fallback.
//
// `pickTable` rows are already aggregated by (playerId, detailedPosition)
// from all submissions for the team — see `getCrowdStats` for how it is built.
//
// `picks` may be fractional — the global mashup passes time-decayed weights.
// `pickRateDenominator` overrides `totalSubmissions` for the rate calculation
// (the global mashup uses `totalWeight + SMOOTHING_ALPHA` for stability).
// `minScore` drops candidates below a threshold (used by the global mashup).
export function buildMostLikelyXi(input: {
  formationSlots: readonly FormationSlot[];
  pickTable: readonly PlayerPickEntry[];
  playerMap: ReadonlyMap<number, Player>;
  totalSubmissions: number;
  pickRateDenominator?: number;
  minScore?: number;
}): MostLikelyXiSlot[] {
  const {
    formationSlots,
    pickTable,
    playerMap,
    totalSubmissions,
    pickRateDenominator,
    minScore = 0,
  } = input;
  const rateDenom = pickRateDenominator ?? totalSubmissions;

  const picksByPlayer = new Map<number, Map<string, number>>();
  for (const e of pickTable) {
    let pp = picksByPlayer.get(e.playerId);
    if (!pp) {
      pp = new Map();
      picksByPlayer.set(e.playerId, pp);
    }
    pp.set(e.detailedPosition, (pp.get(e.detailedPosition) ?? 0) + e.picks);
  }

  const profiles: SlotProfile[] = formationSlots.map((slot, idx) => ({
    idx,
    slot,
    detailed: SLOT_TO_DETAILED[slot.slot] ?? slot.slot,
    broad: slot.position,
  }));

  // Precompute per-slot stats so the fill ordering can decide without rescoring.
  const candidateCounts = new Map<number, number>();
  const maxExact = new Map<number, number>();
  for (const profile of profiles) {
    let count = 0;
    let topExact = 0;
    for (const picks of picksByPlayer.values()) {
      const f = fit(profile, picks);
      if (f.score > minScore) count++;
      if (f.exact > topExact) topExact = f.exact;
    }
    candidateCounts.set(profile.idx, count);
    maxExact.set(profile.idx, topExact);
  }

  const used = new Set<number>();
  const results = new Array<MostLikelyXiSlot>(formationSlots.length);

  for (const profile of fillOrder(profiles, maxExact, candidateCounts)) {
    let bestId: number | null = null;
    let bestFit: SlotFit | null = null;

    for (const [pid, picks] of picksByPlayer) {
      if (used.has(pid)) continue;
      const candidate = fit(profile, picks);
      if (candidate.score <= minScore) continue;

      if (
        bestFit === null ||
        candidate.score > bestFit.score ||
        (candidate.score === bestFit.score && candidate.exact > bestFit.exact) ||
        (candidate.score === bestFit.score &&
          candidate.exact === bestFit.exact &&
          candidate.compatible > bestFit.compatible) ||
        (candidate.score === bestFit.score &&
          candidate.exact === bestFit.exact &&
          candidate.compatible === bestFit.compatible &&
          (bestId === null || pid < bestId))
      ) {
        bestFit = candidate;
        bestId = pid;
      }
    }

    const player = bestId != null ? playerMap.get(bestId) ?? null : null;
    if (player && bestId != null) used.add(bestId);

    const pickRate = bestFit && rateDenom > 0 ? bestFit.compatible / rateDenom : 0;

    results[profile.idx] = {
      slot: profile.slot.slot,
      position: profile.slot.position,
      x: profile.slot.x,
      y: profile.slot.y,
      player: player ?? null,
      pickRate,
    };
  }

  return results;
}
