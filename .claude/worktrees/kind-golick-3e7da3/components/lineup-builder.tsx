"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormationPitch } from "@/components/formation-pitch";
import { PlayerPicker } from "@/components/player-picker";
import { LineupSummary } from "@/components/lineup-summary";
import { FORMATIONS, type FormationDef } from "@/lib/formations";
import type { Player } from "@/lib/db/schema";
import { cn, formatEur } from "@/lib/utils";
import { submitLineupAction } from "@/app/[teamCode]/build/actions";

const BENCH_SIZE = 3;

type Props = {
  players: Player[];
  teamCode: string;
  defaultFormation?: string;
};

type ActiveSlot = { kind: "starter"; index: number } | { kind: "bench"; index: number };

export function LineupBuilder({ players, teamCode, defaultFormation = "4-3-3" }: Props) {
  const router = useRouter();
  const showPhotos = teamCode.toUpperCase() === "USA";
  const [formationName, setFormationName] = React.useState(defaultFormation);
  const formation = React.useMemo<FormationDef>(
    () => FORMATIONS.find((f) => f.name === formationName) ?? FORMATIONS[0],
    [formationName],
  );

  const [starters, setStarters] = React.useState<(Player | null)[]>(() =>
    Array(formation.slots.length).fill(null),
  );
  const [bench, setBench] = React.useState<(Player | null)[]>(() => Array(BENCH_SIZE).fill(null));
  const [active, setActive] = React.useState<ActiveSlot | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [prevFormationName, setPrevFormationName] = React.useState(formationName);

  if (prevFormationName !== formationName) {
    setPrevFormationName(formationName);
    setStarters(Array(formation.slots.length).fill(null));
  }

  const pickedIds = React.useMemo(() => {
    const set = new Set<number>();
    for (const p of starters) if (p) set.add(p.id);
    for (const p of bench) if (p) set.add(p.id);
    return set;
  }, [starters, bench]);

  const slotLabel = React.useMemo(() => {
    if (!active) return "";
    if (active.kind === "starter") {
      const slot = formation.slots[active.index];
      return `${slot.slot} (${slot.position})`;
    }
    return `Bench ${active.index + 1}`;
  }, [active, formation]);

  const filterPosition = React.useMemo(() => {
    if (!active || active.kind !== "starter") return null;
    return formation.slots[active.index].position;
  }, [active, formation]);

  const currentPick = React.useMemo(() => {
    if (!active) return null;
    if (active.kind === "starter") return starters[active.index];
    return bench[active.index];
  }, [active, starters, bench]);

  function handlePick(player: Player) {
    if (!active) return;
    if (active.kind === "starter") {
      setStarters((prev) => {
        const next = [...prev];
        next[active.index] = player;
        return next;
      });
    } else {
      setBench((prev) => {
        const next = [...prev];
        next[active.index] = player;
        return next;
      });
    }
    setActive(null);
  }

  function handleClear() {
    if (!active) return;
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
    setActive(null);
  }

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
    router.push(`/lineup/${result.slug}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-300">Formation</label>
        <select
          value={formationName}
          onChange={(e) => setFormationName(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FORMATIONS.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-zinc-500">
          Tap any slot to pick a player.
        </span>
      </div>

      <FormationPitch
        formation={formation}
        starters={starters}
        onSlotClick={(idx) => setActive({ kind: "starter", index: idx })}
        showPhotos={showPhotos}
      />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Bench (3)</h3>
        <div className="grid grid-cols-3 gap-2">
          {bench.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive({ kind: "bench", index: i })}
              className={cn(
                "flex h-20 flex-col items-center justify-center gap-1 rounded-lg border text-xs transition",
                p
                  ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                  : "border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300",
              )}
            >
              {p ? (
                <>
                  <span className="font-semibold">{p.fullName}</span>
                  <span className="text-[10px] text-zinc-400">
                    {p.detailedPosition} · {formatEur(p.marketValueEur)}
                  </span>
                </>
              ) : (
                <span>+ Bench {i + 1}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <LineupSummary starters={starters} bench={bench} formationName={formationName} />

      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
        >
          {submitting ? "Submitting…" : allFilled ? "Submit lineup" : `Fill all 14 slots`}
        </Button>
      </div>

      <PlayerPicker
        open={active != null}
        onClose={() => setActive(null)}
        onPick={handlePick}
        onClear={handleClear}
        players={players}
        pickedIds={pickedIds}
        filterPosition={filterPosition}
        slotLabel={slotLabel}
        currentPick={currentPick}
        showPhotos={showPhotos}
      />
    </div>
  );
}
