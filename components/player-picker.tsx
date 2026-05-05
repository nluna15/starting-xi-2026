"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { Player } from "@/lib/db/schema";
import {
  BROAD_ORDER,
  DETAILED_BY_BROAD,
  DETAILED_TO_BROAD,
  type BroadPosition,
} from "@/lib/formations";
import { cn, normalize } from "@/lib/utils";

const POSITION_NOUN: Record<string, string> = {
  GK: "keepers",
  DEF: "defenders",
  MID: "midfielders",
  FWD: "forwards",
};

type Mode = "panel" | "sheet";

type PlayerPickerProps = {
  mode: Mode;
  open?: boolean;
  onClose?: () => void;
  onPick: (player: Player) => void;
  onClear?: () => void;
  players: Player[];
  pickedIds: Set<number>;
  filterPosition?: string | null;
  slotLabel: string;
  slotPositionCode?: string | null;
  slotDetailedCode?: string | null;
  slotIndex?: number | null;
  slotKind?: "starter" | "bench" | null;
  currentPick: Player | null;
  showPhotos?: boolean;
  pickCounts?: Map<number, number>;
  totalSubmissions?: number;
};

export function PlayerPicker(props: PlayerPickerProps) {
  if (props.mode === "sheet") {
    return (
      <Modal
        open={Boolean(props.open)}
        onClose={props.onClose ?? (() => undefined)}
        title={undefined}
        ariaLabel="Pick a player"
        className="max-w-xl"
      >
        <PickerBody {...props} />
        <div className="flex justify-end gap-2 border-t border-line p-3">
          <Button variant="ghost" size="sm" onClick={props.onClose}>
            Cancel
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="sticky top-4 self-start overflow-hidden rounded-xl border border-line bg-surface shadow-1">
      <PickerBody {...props} />
    </div>
  );
}

function defaultSelected(
  slotKind: "starter" | "bench" | null | undefined,
  slotPositionCode: string | null | undefined,
  slotDetailedCode: string | null | undefined,
): Set<string> {
  if (slotKind !== "starter") return new Set();
  const broad = (slotPositionCode ?? DETAILED_TO_BROAD[slotDetailedCode ?? ""]) as
    | BroadPosition
    | undefined;
  if (broad && DETAILED_BY_BROAD[broad]) return new Set(DETAILED_BY_BROAD[broad]);
  if (slotDetailedCode) return new Set([slotDetailedCode]);
  return new Set();
}

function PickerBody({
  mode,
  onPick,
  onClear,
  players,
  pickedIds,
  slotPositionCode,
  slotDetailedCode,
  slotIndex,
  slotKind,
  currentPick,
  showPhotos = false,
  pickCounts,
  totalSubmissions,
}: PlayerPickerProps) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(() =>
    defaultSelected(slotKind, slotPositionCode, slotDetailedCode),
  );
  const slotKey = `${slotKind ?? "_"}:${slotIndex ?? "_"}:${slotDetailedCode ?? slotPositionCode ?? "_"}`;
  const [prevSlotKey, setPrevSlotKey] = React.useState(slotKey);

  if (prevSlotKey !== slotKey) {
    setPrevSlotKey(slotKey);
    setSelected(defaultSelected(slotKind, slotPositionCode, slotDetailedCode));
    setQuery("");
  }

  // Buckets visible in the broad-pill row. GK slots stay locked to GK; outfield
  // slots expose all three outfield buckets so users can place any field player.
  const visibleBuckets: BroadPosition[] = React.useMemo(() => {
    if (slotKind === "starter" && slotPositionCode) {
      if (slotPositionCode === "GK") return ["GK"];
      return ["DEF", "MID", "FWD"];
    }
    return BROAD_ORDER;
  }, [slotKind, slotPositionCode]);

  // Buckets to show detailed pills for: any bucket that's the slot's bucket
  // OR any bucket the user has at least one detailed pill toggled on for.
  const expandedBuckets: BroadPosition[] = React.useMemo(() => {
    const set = new Set<BroadPosition>();
    if (slotKind === "starter" && slotPositionCode) {
      set.add(slotPositionCode as BroadPosition);
    }
    for (const code of selected) {
      const broad = DETAILED_TO_BROAD[code];
      if (broad) set.add(broad);
    }
    return BROAD_ORDER.filter((b) => set.has(b));
  }, [slotKind, slotPositionCode, selected]);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    return players
      .filter((p) => {
        if (slotKind === "starter" && slotPositionCode) {
          if (slotPositionCode === "GK" && p.position !== "GK") return false;
          if (slotPositionCode !== "GK" && p.position === "GK") return false;
        }
        if (selected.size === 0) return true;
        return selected.has(p.detailedPosition);
      })
      .filter((p) =>
        q ? normalize(p.fullName).includes(q) || normalize(p.club).includes(q) : true,
      )
      .sort((a, b) => b.marketValueEur - a.marketValueEur);
  }, [players, query, selected, slotKind, slotPositionCode]);

  const eligibleCount = React.useMemo(
    () => filtered.filter((p) => !pickedIds.has(p.id) || p.id === currentPick?.id).length,
    [filtered, pickedIds, currentPick],
  );

  const positionCode = slotPositionCode ?? null;
  const positionAbbrev = slotDetailedCode?.trim() || positionCode || null;
  const positionWord = positionAbbrev ? positionAbbrev.toUpperCase() : "PLAYER";
  const noun = positionCode ? POSITION_NOUN[positionCode] ?? "players" : "players";

  function toggleDetailed(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleBucket(broad: BroadPosition) {
    const codes = DETAILED_BY_BROAD[broad];
    setSelected((prev) => {
      const allOn = codes.every((c) => prev.has(c));
      const next = new Set(prev);
      if (allOn) {
        for (const c of codes) next.delete(c);
      } else {
        for (const c of codes) next.add(c);
      }
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
  }

  const allActive = selected.size === 0;

  return (
    <div className="flex flex-col">
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
              Picking for
            </span>
            <p className="cond text-[13px] text-ink">{positionWord}</p>
          </div>
          {onClear && currentPick ? (
            <Button variant="destructive" size="sm" onClick={onClear}>
              Clear slot
            </Button>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              as="button"
              type="button"
              size="sm"
              selected={allActive}
              onClick={clearAll}
              aria-pressed={allActive}
            >
              All
            </Chip>
            {visibleBuckets.map((broad) => {
              const codes = DETAILED_BY_BROAD[broad];
              const active = codes.every((c) => selected.has(c));
              return (
                <Chip
                  key={broad}
                  as="button"
                  type="button"
                  size="sm"
                  selected={active}
                  onClick={() => toggleBucket(broad)}
                  aria-pressed={active}
                >
                  {broad}
                </Chip>
              );
            })}
          </div>
          {expandedBuckets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {expandedBuckets.flatMap((broad) =>
                DETAILED_BY_BROAD[broad].map((code) => (
                  <Chip
                    key={code}
                    as="button"
                    type="button"
                    size="sm"
                    selected={selected.has(code)}
                    onClick={() => toggleDetailed(code)}
                    aria-pressed={selected.has(code)}
                    className="h-6 px-2.5 text-[10px]"
                  >
                    {code}
                  </Chip>
                )),
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun}…`}
            aria-label={`Search ${noun}`}
            className={cn(
              "w-full rounded-md border border-line bg-bg px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint",
              "transition-[border-color,box-shadow] duration-150 ease-in-out",
              "hover:border-line-strong",
              "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
            )}
          />
        </div>
      </div>

      <ul
        className={cn(
          "divide-y divide-line overflow-y-auto",
          mode === "sheet" ? "max-h-[55vh]" : "max-h-[480px]",
        )}
      >
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-[13px] text-ink-3">
            No players match &ldquo;{query}&rdquo;.
          </li>
        )}
        {filtered.map((p) => {
          const taken = pickedIds.has(p.id) && p.id !== currentPick?.id;
          const isCurrent = p.id === currentPick?.id;
          const count = pickCounts?.get(p.id) ?? 0;
          const total = totalSubmissions ?? 0;
          const rate = total > 0 ? count / total : 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={taken}
                onClick={() => onPick(p)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
                  "transition-[background-color] duration-150 ease-in-out",
                  "focus-visible:outline-none focus-visible:bg-surface-2",
                  taken
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-surface-2",
                  isCurrent && "bg-accent-soft",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {showPhotos && (
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line bg-surface-2">
                      {p.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-ink">
                      {p.fullName}
                    </div>
                    <div className="truncate mono text-[11px] tracking-[0.08em] text-ink-3">
                      {p.detailedPosition} · {p.age}y · {p.club}
                    </div>
                  </div>
                </div>
                {rate > 0 && (
                  <div className="shrink-0 text-right">
                    <div className="mono text-[13px] font-bold text-accent">
                      {Math.round(rate * 100)}%
                    </div>
                    <div className="mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
                      picked
                    </div>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line bg-surface-2 px-4 py-2">
        <span className="mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
          <span className="tabular-nums">{eligibleCount}</span> eligible
          {mode === "panel" && " · click a pitch slot to retarget"}
        </span>
      </div>
    </div>
  );
}
