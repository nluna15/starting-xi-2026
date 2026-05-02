"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BuildPitch } from "@/components/build-pitch";
import { PlayerPicker } from "@/components/player-picker";
import {
  BUILDABLE_FORMATIONS,
  compareBuildableFormationChips,
  SLOT_TO_DETAILED,
  reassignStarters,
  type FormationDef,
} from "@/lib/formations";
import type { Player } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { submitLineupAction } from "@/app/[teamCode]/build/actions";

const BENCH_SIZE = 3;

type Props = {
  players: Player[];
  teamCode: string;
  defaultFormation?: string;
  pickCounts?: Array<[number, number]>;
  totalSubmissions?: number;
};

type ActiveSlot = { kind: "starter"; index: number } | { kind: "bench"; index: number };

export function LineupBuilder({
  players,
  teamCode,
  defaultFormation = "4-3-3",
  pickCounts,
  totalSubmissions = 0,
}: Props) {
  const router = useRouter();
  const showPhotos = true;
  const [formationName, setFormationName] = React.useState(defaultFormation);
  const formation = React.useMemo<FormationDef>(
    () => BUILDABLE_FORMATIONS.find((f) => f.name === formationName) ?? BUILDABLE_FORMATIONS[0],
    [formationName],
  );
  const sortedFormations = React.useMemo(
    () => [...BUILDABLE_FORMATIONS].sort(compareBuildableFormationChips),
    [],
  );

  const [starters, setStarters] = React.useState<(Player | null)[]>(() =>
    Array(formation.slots.length).fill(null),
  );
  const [bench, setBench] = React.useState<(Player | null)[]>(() => Array(BENCH_SIZE).fill(null));
  const [active, setActive] = React.useState<ActiveSlot>({ kind: "starter", index: 0 });
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [prevFormation, setPrevFormation] = React.useState<FormationDef>(formation);

  if (prevFormation.name !== formation.name) {
    const { starters: next } = reassignStarters(starters, prevFormation.slots, formation.slots);
    setPrevFormation(formation);
    setStarters(next);
    setActive({ kind: "starter", index: 0 });
  }

  const pickCountMap = React.useMemo(() => {
    const m = new Map<number, number>();
    if (pickCounts) for (const [id, c] of pickCounts) m.set(id, c);
    return m;
  }, [pickCounts]);

  const pickedIds = React.useMemo(() => {
    const set = new Set<number>();
    for (const p of starters) if (p) set.add(p.id);
    for (const p of bench) if (p) set.add(p.id);
    return set;
  }, [starters, bench]);

  const slotPositionCode =
    active.kind === "starter" ? formation.slots[active.index].position : null;
  const slotDetailedCode =
    active.kind === "starter"
      ? SLOT_TO_DETAILED[formation.slots[active.index].slot] ?? null
      : null;
  const slotLabel =
    active.kind === "starter"
      ? `${formation.slots[active.index].slot} (${formation.slots[active.index].position})`
      : `Bench ${active.index + 1}`;

  const currentPick =
    active.kind === "starter" ? starters[active.index] : bench[active.index];

  function setActiveSlot(slot: ActiveSlot) {
    setActive(slot);
    setSheetOpen(true);
  }

  function handlePick(player: Player) {
    if (active.kind === "starter") {
      setStarters((prev) => {
        const next = [...prev];
        next[active.index] = player;
        return next;
      });
      const nextEmpty = findNextEmpty(starters, active.index, player);
      if (nextEmpty != null) {
        setActive({ kind: "starter", index: nextEmpty });
      } else {
        // All starters filled — advance to the first empty bench slot.
        const firstBench = bench.findIndex((p) => !p);
        if (firstBench !== -1) setActive({ kind: "bench", index: firstBench });
      }
    } else {
      setBench((prev) => {
        const next = [...prev];
        next[active.index] = player;
        return next;
      });
      const nextEmpty = findNextEmptyBench(bench, active.index);
      if (nextEmpty != null) {
        setActive({ kind: "bench", index: nextEmpty });
      } else {
        // All bench filled — fall back to first empty starter if any.
        const firstStarter = starters.findIndex((p) => !p);
        if (firstStarter !== -1) setActive({ kind: "starter", index: firstStarter });
      }
    }
    setSheetOpen(false);
  }

  function handleClear() {
    if (active.kind === "starter") {
      setStarters((prev) => {
        const next = [...prev];
        next[active.index] = null;
        return next;
      });
    } else {
      setBench((prev) => {
        const next = [...prev];
        next[active.index] = null;
        return next;
      });
    }
  }

  const filledCount = starters.filter(Boolean).length + bench.filter(Boolean).length;
  const startersFilled = starters.filter(Boolean).length;
  const benchFilled = bench.filter(Boolean).length;
  const allFilled =
    starters.every((p): p is Player => Boolean(p)) && bench.every((p): p is Player => Boolean(p));

  async function handleSubmit() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setError(null);
    const startersIds = starters.map((p) => p!.id);
    const benchIds = bench.map((p) => p!.id);
    const result = await submitLineupAction({
      teamCode,
      formationName,
      starters: startersIds,
      bench: benchIds,
    });
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push(`/lineup/${result.slug}?submitted=1`);
  }

  const highlightSlot = active.kind === "starter" ? active.index : null;

  // The "next blank to fill" is the active slot when it's empty; otherwise the
  // next empty slot in reading order, falling through from starters to bench
  // (or vice versa) so the highlight always lands on something the user can
  // act on. Returns `null` only when every slot is filled.
  const nextBlank = React.useMemo<
    | { kind: "starter"; index: number }
    | { kind: "bench"; index: number; total: number }
    | null
  >(() => {
    const findEmpty = (arr: (Player | null)[], from: number) => {
      for (let i = from; i < arr.length; i += 1) if (!arr[i]) return i;
      for (let i = 0; i < from; i += 1) if (!arr[i]) return i;
      return null;
    };
    if (active.kind === "starter") {
      if (!starters[active.index]) return { kind: "starter", index: active.index };
      const s = findEmpty(starters, active.index);
      if (s != null) return { kind: "starter", index: s };
      const b = findEmpty(bench, 0);
      if (b != null) return { kind: "bench", index: b, total: bench.length };
      return null;
    }
    if (!bench[active.index])
      return { kind: "bench", index: active.index, total: bench.length };
    const b = findEmpty(bench, active.index);
    if (b != null) return { kind: "bench", index: b, total: bench.length };
    const s = findEmpty(starters, 0);
    if (s != null) return { kind: "starter", index: s };
    return null;
  }, [active, starters, bench]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-4">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
          Formation
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {sortedFormations.map((f) => {
            const active = f.name === formationName;
            return (
              <button
                key={f.name}
                type="button"
                onClick={() => setFormationName(f.name)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-foreground/70 hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="order-2 space-y-4 md:order-1">
          <div>
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
              <span className="tabular-nums">
                {startersFilled} / 11 starting
              </span>
              <span className="text-foreground/35" aria-hidden>
                |
              </span>
              <span className="tabular-nums">
                {benchFilled} / {BENCH_SIZE} substitutes
              </span>
            </span>
          </div>

          <div className="mx-auto w-[90%]">
            <BuildPitch
              formation={formation}
              starters={starters}
              bench={bench}
              onSlotClick={(idx) => setActiveSlot({ kind: "starter", index: idx })}
              onBenchClick={(idx) => setActiveSlot({ kind: "bench", index: idx })}
              highlightSlot={highlightSlot}
              activeBlank={nextBlank}
              showPhotos={showPhotos}
            />
          </div>
        </div>

        <div className="order-1 flex flex-col gap-4 md:order-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allFilled || submitting}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-bold uppercase tracking-wide transition",
                allFilled && !submitting
                  ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                  : "cursor-not-allowed bg-border text-muted",
              )}
            >
              {submitting
                ? "Submitting…"
                : allFilled
                  ? "Review & Submit"
                  : `${14 - filledCount} ${14 - filledCount === 1 ? "pick" : "picks"} remaining`}
            </button>
          </div>

          <div className="hidden min-h-0 flex-1 md:block">
            <PlayerPicker
              mode="panel"
              onPick={handlePick}
              onClear={handleClear}
              players={players}
              pickedIds={pickedIds}
              filterPosition={slotPositionCode}
              slotLabel={slotLabel}
              slotPositionCode={slotPositionCode}
              slotDetailedCode={slotDetailedCode}
              slotIndex={active.index}
              slotKind={active.kind}
              currentPick={currentPick}
              showPhotos={showPhotos}
              pickCounts={pickCountMap}
              totalSubmissions={totalSubmissions}
            />
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <PlayerPicker
          mode="sheet"
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onPick={handlePick}
          onClear={handleClear}
          players={players}
          pickedIds={pickedIds}
          filterPosition={slotPositionCode}
          slotLabel={slotLabel}
          slotPositionCode={slotPositionCode}
          slotDetailedCode={slotDetailedCode}
          slotIndex={active.index}
          slotKind={active.kind}
          currentPick={currentPick}
          showPhotos={showPhotos}
          pickCounts={pickCountMap}
          totalSubmissions={totalSubmissions}
        />
      </div>

      {error && (
        <div className="rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </div>
      )}
    </div>
  );
}

function findNextEmpty(
  starters: (Player | null)[],
  fromIndex: number,
  justPicked: Player,
): number | null {
  for (let i = fromIndex + 1; i < starters.length; i += 1) {
    if (!starters[i] || starters[i]?.id === justPicked.id) {
      if (i === fromIndex) continue;
      if (!starters[i]) return i;
    }
  }
  for (let i = 0; i < fromIndex; i += 1) {
    if (!starters[i]) return i;
  }
  return null;
}

function findNextEmptyBench(bench: (Player | null)[], fromIndex: number): number | null {
  for (let i = fromIndex + 1; i < bench.length; i += 1) {
    if (!bench[i]) return i;
  }
  for (let i = 0; i < fromIndex; i += 1) {
    if (!bench[i]) return i;
  }
  return null;
}
