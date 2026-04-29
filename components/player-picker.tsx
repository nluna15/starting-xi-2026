"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/db/schema";
import {
  BROAD_ORDER,
  DETAILED_BY_BROAD,
  DETAILED_TO_BROAD,
  POSITION_LABEL,
  type BroadPosition,
} from "@/lib/formations";
import { cn } from "@/lib/utils";

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
        className="max-w-xl"
      >
        <PickerBody {...props} />
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          {props.onClear && props.currentPick ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onClear}
              className="bg-accent text-accent-foreground hover:bg-accent-hover hover:text-accent-foreground"
            >
              Clear slot
            </Button>
          ) : (
            <span />
          )}
          <Button variant="secondary" size="sm" onClick={props.onClose}>
            Cancel
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="sticky top-4 self-start overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <PickerBody {...props} />
    </div>
  );
}

function defaultSelected(
  slotKind: "starter" | "bench" | null | undefined,
  slotDetailedCode: string | null | undefined,
): Set<string> {
  if (slotKind === "starter" && slotDetailedCode) return new Set([slotDetailedCode]);
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
    defaultSelected(slotKind, slotDetailedCode),
  );
  const slotKey = `${slotKind ?? "_"}:${slotIndex ?? "_"}:${slotDetailedCode ?? slotPositionCode ?? "_"}`;
  const [prevSlotKey, setPrevSlotKey] = React.useState(slotKey);

  if (prevSlotKey !== slotKey) {
    setPrevSlotKey(slotKey);
    setSelected(defaultSelected(slotKind, slotDetailedCode));
    setQuery("");
  }

  // Buckets visible in the broad-pill row.
  const visibleBuckets: BroadPosition[] = React.useMemo(() => {
    if (slotKind === "starter" && slotPositionCode) {
      return [slotPositionCode as BroadPosition];
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
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => (selected.size === 0 ? true : selected.has(p.detailedPosition)))
      .filter((p) =>
        q ? p.fullName.toLowerCase().includes(q) || p.club.toLowerCase().includes(q) : true,
      );
  }, [players, query, selected]);

  const eligibleCount = React.useMemo(
    () => filtered.filter((p) => !pickedIds.has(p.id) || p.id === currentPick?.id).length,
    [filtered, pickedIds, currentPick],
  );

  const positionCode = slotPositionCode ?? null;
  const positionWord = positionCode ? POSITION_LABEL[positionCode]?.toUpperCase() : "PLAYER";
  const noun = positionCode ? POSITION_NOUN[positionCode] ?? "players" : "players";
  const slotNumberText =
    slotKind === "bench"
      ? `BENCH ${(slotIndex ?? 0) + 1}`
      : slotIndex != null
        ? `SLOT ${slotIndex + 1}`
        : null;

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
      <div className="space-y-3 border-b border-border p-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-foreground">
            Pick for{" "}
            <span className="text-foreground">{positionWord}</span>{" "}
            {slotNumberText && (
              <span className="text-accent">· {slotNumberText}</span>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">
            {currentPick ? (
              <>
                Current: <span className="font-medium text-foreground">{currentPick.fullName}</span>{" "}
                — tap another to swap
              </>
            ) : (
              <>No pick yet — tap a player to fill this slot</>
            )}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill active={allActive} onClick={clearAll}>
              All
            </FilterPill>
            {visibleBuckets.map((broad) => {
              const codes = DETAILED_BY_BROAD[broad];
              const active = codes.every((c) => selected.has(c));
              return (
                <FilterPill key={broad} active={active} onClick={() => toggleBucket(broad)}>
                  {broad}
                </FilterPill>
              );
            })}
          </div>
          {expandedBuckets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {expandedBuckets.flatMap((broad) =>
                DETAILED_BY_BROAD[broad].map((code) => (
                  <FilterPill
                    key={code}
                    active={selected.has(code)}
                    onClick={() => toggleDetailed(code)}
                    variant="detailed"
                  >
                    {code}
                  </FilterPill>
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
            className="w-full rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <ul
        className={cn(
          "divide-y divide-border overflow-y-auto",
          mode === "sheet" ? "max-h-[55vh]" : "max-h-[480px]",
        )}
      >
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted">
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
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition",
                  taken
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-surface-muted",
                  isCurrent && "bg-accent-soft",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {showPhotos && (
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
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
                    <div className="truncate text-sm font-semibold uppercase tracking-wide text-foreground">
                      {p.fullName}
                    </div>
                    <div className="truncate text-[11px] uppercase tracking-wide text-muted">
                      {p.detailedPosition} · {p.age}y · {p.club}
                    </div>
                  </div>
                </div>
                {rate > 0 && (
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-bold text-accent">{Math.round(rate * 100)}%</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">picked</div>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-muted px-4 py-2 text-[11px] uppercase tracking-wide text-muted">
        <span>
          {eligibleCount} eligible
          {mode === "panel" && " · click a pitch slot to retarget"}
        </span>
        {mode === "panel" && onClear && currentPick && (
          <button
            type="button"
            onClick={onClear}
            className="font-semibold text-accent hover:text-accent-hover"
          >
            Clear slot
          </button>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  variant = "broad",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "broad" | "detailed";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
        variant === "detailed" ? "px-2.5 py-0.5 text-[11px]" : null,
        active
          ? "bg-accent text-accent-foreground"
          : "border border-border bg-surface text-foreground hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}
