import assert from "node:assert/strict";
import { buildMostLikelyXi, type PlayerPickEntry } from "../lib/community/most-likely-xi";
import type { FormationSlot, Player } from "../lib/db/schema";
import { getFormation } from "../lib/formations";

function player(id: number, name: string, detailed: string): Player {
  const broad = ["LB", "CB", "RB"].includes(detailed)
    ? "DEF"
    : ["CDM", "CM", "CAM", "LM", "RM"].includes(detailed)
      ? "MID"
      : ["LW", "RW", "ST", "SS"].includes(detailed)
        ? "FWD"
        : "GK";
  return {
    id,
    transfermarktId: 1000 + id,
    teamId: 1,
    fullName: name,
    position: broad,
    detailedPosition: detailed,
    jerseyNumber: id,
    club: "Test FC",
    age: 25,
    marketValueEur: 1_000_000,
    photoUrl: null,
    internationalCaps: 0,
    internationalGoals: 0,
    selectable: true,
  };
}

function formation(name: string): FormationSlot[] {
  const f = getFormation(name);
  if (!f) throw new Error(`Unknown formation ${name}`);
  return f.slots;
}

function playerMapOf(...ps: Player[]): Map<number, Player> {
  return new Map(ps.map((p) => [p.id, p]));
}

function slotByName(slots: ReturnType<typeof buildMostLikelyXi>, name: string) {
  const hit = slots.find((s) => s.slot === name);
  if (!hit) throw new Error(`No slot named ${name} in result`);
  return hit;
}

let testsRun = 0;
let testsFailed = 0;
function test(name: string, fn: () => void) {
  testsRun++;
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    testsFailed++;
    console.error(`  FAIL  ${name}`);
    console.error(err instanceof Error ? err.stack ?? err.message : err);
  }
}

// --- tests ---

test("exact-position match: LB picks fill the LB slot in 4-3-3", () => {
  const slots = formation("4-3-3");
  const alice = player(1, "Alice", "LB");
  const picks: PlayerPickEntry[] = [{ playerId: 1, detailedPosition: "LB", picks: 8 }];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(alice),
    totalSubmissions: 10,
  });
  const lb = slotByName(out, "LB");
  assert.equal(lb.player?.id, 1, "LB slot should be Alice");
  assert.equal(lb.pickRate, 0.8, "pickRate = 8/10");
});

test("broad fallback: CDM picks fill a CM slot (4-3-3 has no CDM slot)", () => {
  const slots = formation("4-3-3");
  const tyler = player(1, "Tyler", "CDM");
  const picks: PlayerPickEntry[] = [{ playerId: 1, detailedPosition: "CDM", picks: 6 }];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(tyler),
    totalSubmissions: 10,
  });
  // 4-3-3 has CM slots (no CDM). Tyler should land in one of them.
  const midSlots = out.filter((s) => s.position === "MID");
  const tylerSlot = midSlots.find((s) => s.player?.id === 1);
  assert.ok(tylerSlot, "Tyler should be placed in a MID slot via broad fallback");
  // Pick rate is the compatible count over total submissions.
  assert.equal(tylerSlot!.pickRate, 0.6);
});

test("exact beats broad-only at equal score (tiebreak)", () => {
  // Construct a slot where two players tie on score but one is exact.
  // CM slot: A has 10 CDM picks (broad-only) → score = 0.5 * 10 = 5
  //          B has 5 CM picks (exact)         → score = 1.0 * 5  = 5
  // Tiebreak should favor B (more exact).
  const slots = formation("4-3-3");
  const a = player(1, "BroadOnly", "CDM");
  const b = player(2, "Exact", "CM");
  const picks: PlayerPickEntry[] = [
    { playerId: 1, detailedPosition: "CDM", picks: 10 },
    { playerId: 2, detailedPosition: "CM", picks: 5 },
  ];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(a, b),
    totalSubmissions: 20,
  });
  // The first CM slot filled should be B (exact). Then A fills another MID slot.
  const cmSlot = out.find((s) => s.player?.id === 2);
  assert.ok(cmSlot, "Exact-CM player B should be placed");
  assert.equal(cmSlot!.position, "MID");
});

test("GK slot ignores outfield picks even with higher raw counts", () => {
  const slots = formation("4-3-3");
  const cb = player(1, "BigCB", "CB");
  const gk = player(2, "SmallGK", "GK");
  const picks: PlayerPickEntry[] = [
    { playerId: 1, detailedPosition: "CB", picks: 50 },
    { playerId: 2, detailedPosition: "GK", picks: 3 },
  ];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(cb, gk),
    totalSubmissions: 50,
  });
  const gkSlot = slotByName(out, "GK");
  assert.equal(gkSlot.player?.id, 2, "GK slot must be a GK pick, not a CB");
  assert.equal(gkSlot.pickRate, 3 / 50);
});

test("player uniqueness: two CB slots get two different players", () => {
  const slots = formation("4-3-3");
  const a = player(1, "CB-A", "CB");
  const b = player(2, "CB-B", "CB");
  const picks: PlayerPickEntry[] = [
    { playerId: 1, detailedPosition: "CB", picks: 9 },
    { playerId: 2, detailedPosition: "CB", picks: 7 },
  ];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(a, b),
    totalSubmissions: 10,
  });
  const lcb = slotByName(out, "LCB");
  const rcb = slotByName(out, "RCB");
  const ids = [lcb.player?.id, rcb.player?.id].sort();
  assert.deepEqual(ids, [1, 2], "LCB and RCB must be filled by two different players");
});

test("empty pickTable yields all-null slots with pickRate 0", () => {
  const slots = formation("4-3-3");
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: [],
    playerMap: new Map(),
    totalSubmissions: 0,
  });
  assert.equal(out.length, 11);
  for (const s of out) {
    assert.equal(s.player, null);
    assert.equal(s.pickRate, 0);
  }
});

test("specificity ordering: rare-cohort slot gets first pick of a contested player", () => {
  // Player X is the only "RW" pick in the pool (only candidate for RW).
  // Player X is also the top "LW" pick. Player Y is a fallback LW.
  // Specificity ordering: RW has 1 candidate, LW has 2 candidates.
  // RW should be filled first with X, then LW gets Y.
  const slots = formation("4-3-3");
  const x = player(1, "Versatile", "RW");
  const y = player(2, "LW-Only", "LW");
  const picks: PlayerPickEntry[] = [
    { playerId: 1, detailedPosition: "RW", picks: 8 },
    { playerId: 1, detailedPosition: "LW", picks: 6 },
    { playerId: 2, detailedPosition: "LW", picks: 4 },
  ];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(x, y),
    totalSubmissions: 10,
  });
  assert.equal(slotByName(out, "RW").player?.id, 1, "RW must take X (rarer slot first)");
  assert.equal(slotByName(out, "LW").player?.id, 2, "LW falls back to Y after X is consumed");
});

test("pick-rate uses total submissions as denominator, capped logically", () => {
  const slots = formation("4-3-3");
  const cb = player(1, "Solid", "CB");
  const picks: PlayerPickEntry[] = [{ playerId: 1, detailedPosition: "CB", picks: 7 }];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(cb),
    totalSubmissions: 10,
  });
  const filled = out.find((s) => s.player?.id === 1);
  assert.ok(filled);
  assert.equal(filled!.pickRate, 0.7);
});

test("totalSubmissions = 0 -> pickRate 0 (no divide-by-zero)", () => {
  const slots = formation("4-3-3");
  const cb = player(1, "Solid", "CB");
  const picks: PlayerPickEntry[] = [{ playerId: 1, detailedPosition: "CB", picks: 7 }];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(cb),
    totalSubmissions: 0,
  });
  for (const s of out) assert.equal(s.pickRate, 0);
});

test("pickRateDenominator overrides totalSubmissions (global mashup case)", () => {
  const slots = formation("4-3-3");
  const cb = player(1, "Weighted", "CB");
  const picks: PlayerPickEntry[] = [{ playerId: 1, detailedPosition: "CB", picks: 7.5 }];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(cb),
    totalSubmissions: 100,
    pickRateDenominator: 15, // e.g. totalWeight + SMOOTHING_ALPHA
  });
  const filled = out.find((s) => s.player?.id === 1);
  assert.ok(filled);
  assert.equal(filled!.pickRate, 0.5, "uses denominator override (7.5 / 15)");
});

test("minScore threshold drops weak candidates (global mashup case)", () => {
  const slots = formation("4-3-3");
  const weak = player(1, "Weak", "CB");
  const picks: PlayerPickEntry[] = [{ playerId: 1, detailedPosition: "CB", picks: 0.8 }];
  const out = buildMostLikelyXi({
    formationSlots: slots,
    pickTable: picks,
    playerMap: playerMapOf(weak),
    totalSubmissions: 10,
    minScore: 1.0,
  });
  for (const s of out) assert.equal(s.player, null, "no slot should be filled below threshold");
});

// --- summary ---
console.log(`\n${testsRun - testsFailed}/${testsRun} tests passed`);
if (testsFailed > 0) {
  process.exit(1);
}
