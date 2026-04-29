import formationsJson from "@/data/formations.json";
import type { FormationSlot, Player } from "@/lib/db/schema";

export type FormationDef = {
  name: string;
  slots: FormationSlot[];
};

export const FORMATIONS: FormationDef[] = formationsJson as FormationDef[];

export function getFormation(name: string): FormationDef | undefined {
  return FORMATIONS.find((f) => f.name === name);
}

export const POSITION_LABEL: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

export type BroadPosition = "GK" | "DEF" | "MID" | "FWD";

export const BROAD_ORDER: BroadPosition[] = ["GK", "DEF", "MID", "FWD"];

export const DETAILED_BY_BROAD: Record<BroadPosition, string[]> = {
  GK: ["GK"],
  DEF: ["LB", "CB", "RB"],
  MID: ["CDM", "CM", "CAM", "LM", "RM"],
  FWD: ["LW", "ST", "SS", "RW"],
};

export const DETAILED_TO_BROAD: Record<string, BroadPosition> = (() => {
  const m: Record<string, BroadPosition> = {};
  for (const broad of BROAD_ORDER) {
    for (const d of DETAILED_BY_BROAD[broad]) m[d] = broad;
  }
  return m;
})();

// Map a formation slot name (e.g., "LCB", "LWB", "LST") to the detailed
// position the player data actually uses ("CB", "LB", "ST"). LWB/RWB don't
// exist as detailed positions in the data, so they alias to LB/RB.
export const SLOT_TO_DETAILED: Record<string, string> = {
  GK: "GK",
  LB: "LB",
  LWB: "LB",
  RB: "RB",
  RWB: "RB",
  CB: "CB",
  LCB: "CB",
  RCB: "CB",
  CDM: "CDM",
  LCDM: "CDM",
  RCDM: "CDM",
  CM: "CM",
  LCM: "CM",
  RCM: "CM",
  CAM: "CAM",
  LAM: "CAM",
  RAM: "CAM",
  LM: "LM",
  RM: "RM",
  LW: "LW",
  RW: "RW",
  ST: "ST",
  LST: "ST",
  RST: "ST",
};

const COMPATIBLE: Record<FormationSlot["position"], FormationSlot["position"][]> = {
  GK: ["GK"],
  DEF: ["DEF", "MID"],
  MID: ["DEF", "MID", "FWD"],
  FWD: ["MID", "FWD"],
};

function isCompatible(a: FormationSlot["position"], b: FormationSlot["position"]) {
  return COMPATIBLE[a].includes(b);
}

function distance(a: FormationSlot, b: FormationSlot) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function reassignStarters(
  oldStarters: (Player | null)[],
  oldSlots: FormationSlot[],
  newSlots: FormationSlot[],
): { starters: (Player | null)[]; dropped: Player[] } {
  const next: (Player | null)[] = Array(newSlots.length).fill(null);

  const pool = oldStarters
    .map((player, idx) => (player ? { player, slot: oldSlots[idx] } : null))
    .filter((x): x is { player: Player; slot: FormationSlot } => x !== null);
  const usedPlayer = new Set<number>();
  const filledSlot = new Set<number>();

  // Pass 1: exact slot-name match.
  for (let i = 0; i < newSlots.length; i++) {
    const newSlot = newSlots[i];
    const match = pool.find(
      ({ player, slot }) => !usedPlayer.has(player.id) && slot.slot === newSlot.slot,
    );
    if (match) {
      next[i] = match.player;
      usedPlayer.add(match.player.id);
      filledSlot.add(i);
    }
  }

  // Pass 2: same position category, nearest neighbor by (x, y).
  for (let i = 0; i < newSlots.length; i++) {
    if (filledSlot.has(i)) continue;
    const newSlot = newSlots[i];
    let best: { id: number; dist: number } | null = null;
    for (const { player, slot } of pool) {
      if (usedPlayer.has(player.id)) continue;
      if (slot.position !== newSlot.position) continue;
      const d = distance(slot, newSlot);
      if (best === null || d < best.dist) best = { id: player.id, dist: d };
    }
    if (best) {
      const picked = pool.find((entry) => entry.player.id === best!.id)!;
      next[i] = picked.player;
      usedPlayer.add(picked.player.id);
      filledSlot.add(i);
    }
  }

  // Pass 3: adjacent (one-rung) position category, nearest neighbor.
  for (let i = 0; i < newSlots.length; i++) {
    if (filledSlot.has(i)) continue;
    const newSlot = newSlots[i];
    let best: { id: number; dist: number } | null = null;
    for (const { player, slot } of pool) {
      if (usedPlayer.has(player.id)) continue;
      if (!isCompatible(slot.position, newSlot.position)) continue;
      const d = distance(slot, newSlot);
      if (best === null || d < best.dist) best = { id: player.id, dist: d };
    }
    if (best) {
      const picked = pool.find((entry) => entry.player.id === best!.id)!;
      next[i] = picked.player;
      usedPlayer.add(picked.player.id);
      filledSlot.add(i);
    }
  }

  const dropped = pool
    .filter(({ player }) => !usedPlayer.has(player.id))
    .map(({ player }) => player);

  return { starters: next, dropped };
}
