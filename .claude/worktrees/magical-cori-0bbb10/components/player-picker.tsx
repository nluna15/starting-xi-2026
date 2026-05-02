"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/db/schema";
import { cn, formatEur } from "@/lib/utils";

type PlayerPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (player: Player) => void;
  onClear?: () => void;
  players: Player[];
  pickedIds: Set<number>;
  filterPosition?: string | null;
  slotLabel: string;
  currentPick: Player | null;
  showPhotos?: boolean;
};

export function PlayerPicker({
  open,
  onClose,
  onPick,
  onClear,
  players,
  pickedIds,
  filterPosition,
  slotLabel,
  currentPick,
  showPhotos = false,
}: PlayerPickerProps) {
  const [query, setQuery] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setQuery("");
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => (filterPosition ? p.position === filterPosition : true))
      .filter((p) =>
        q ? p.fullName.toLowerCase().includes(q) || p.club.toLowerCase().includes(q) : true,
      );
  }, [players, query, filterPosition]);

  return (
    <Modal open={open} onClose={onClose} title={`Pick ${slotLabel}`}>
      <div className="border-b border-zinc-800 p-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or club…"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <ul className="max-h-[60vh] overflow-y-auto divide-y divide-zinc-800">
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            No players match &ldquo;{query}&rdquo;.
          </li>
        )}
        {filtered.map((p) => {
          const taken = pickedIds.has(p.id) && p.id !== currentPick?.id;
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
                    : "hover:bg-zinc-800",
                  p.id === currentPick?.id && "bg-blue-900/40",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {showPhotos && (
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-800">
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
                    <div className="truncate text-sm font-medium text-zinc-100">{p.fullName}</div>
                    <div className="truncate text-xs text-zinc-400">
                      {p.detailedPosition} · {p.club} · {p.age}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-xs text-zinc-400">{formatEur(p.marketValueEur)}</div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 p-3">
        {onClear && currentPick ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear slot
          </Button>
        ) : (
          <span />
        )}
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
