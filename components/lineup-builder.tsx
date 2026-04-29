"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FormationPitch } from "@/components/formation-pitch";
import { PlayerPicker } from "@/components/player-picker";
import {
  FORMATIONS,
  SLOT_TO_DETAILED,
  reassignStarters,
  type FormationDef,
} from "@/lib/formations";
import type { Player } from "@/lib/db/schema";
import { cn, formatAge, formatEur } from "@/lib/utils";
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
    () => FORMATIONS.find((f) => f.name === formationName) ?? FORMATIONS[0],
    [formationName],
  );
  const sortedFormations = React.useMemo(
    () =>
      [...FORMATIONS].sort((a, b) => {
        const aDefenders = a.slots.filter((slot) => slot.position === "DEF").length;
        const bDefenders = b.slots.filter((slot) => slot.position === "DEF").length;
        if (aDefenders !== bDefenders) return aDefenders - bDefenders;
        return a.name.localeCompare(b.name);
      }),
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
  const allFilled =
    starters.every((p): p is Player => Boolean(p)) && bench.every((p): p is Player => Boolean(p));

  const startersOnly = starters.filter((p): p is Player => Boolean(p));
  const allPicks = [...startersOnly, ...bench.filter((p): p is Player => Boolean(p))];
  const avgAge =
    startersOnly.length > 0
      ? startersOnly.reduce((s, p) => s + p.age, 0) / startersOnly.length
      : null;
  const totalValue = allPicks.reduce((s, p) => s + p.marketValueEur, 0);

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
        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", allFilled ? "bg-accent" : "bg-muted")} />
              {startersFilled} / 11 Starting
            </span>
          </div>

          <FormationPitch
            formation={formation}
            starters={starters}
            onSlotClick={(idx) => setActiveSlot({ kind: "starter", index: idx })}
            highlightSlot={highlightSlot}
            showPhotos={showPhotos}
          />

          <div className="flex items-end justify-center gap-6 pt-2">
            {bench.map((p, i) => {
              const isActive = active.kind === "bench" && active.index === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlot({ kind: "bench", index: i })}
                  className="group flex flex-col items-center gap-1.5 focus:outline-none"
                >
                  <div className="relative">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-sm",
                        p
                          ? "border-foreground/20 bg-surface text-foreground"
                          : "border-dashed border-border-strong bg-surface-muted text-muted",
                        isActive && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                      )}
                    >
                      {p?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photoUrl}
                          alt={p.fullName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : p ? (
                        getInitials(p.fullName)
                      ) : (
                        "+"
                      )}
                    </div>
                    {p?.jerseyNumber != null && (
                      <span className="pointer-events-none absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-bold leading-none text-foreground shadow-sm">
                        {p.jerseyNumber}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "max-w-[80px] truncate text-[11px] font-semibold uppercase tracking-wide",
                      p ? "text-foreground" : "text-muted",
                    )}
                  >
                    {p ? getLastName(p.fullName) : `Sub ${i + 1}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden md:block">
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

      <div className="flex flex-col items-stretch gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Stat label="Avg age" value={formatAge(avgAge)} />
          <Stat label="Filled" value={`${filledCount} / 14`} />
          <Stat label="Value" value={formatEur(totalValue)} />
        </div>
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
          {submitting ? "Submitting…" : allFilled ? "Review & Submit" : `Fill ${14 - filledCount} more`}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
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
