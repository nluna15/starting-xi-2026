"use client";

import * as React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { computeAverages } from "@/components/lineup-summary";
import type { Player } from "@/lib/db/schema";
import { cn, formatAge, formatEur } from "@/lib/utils";

type Team = { name: string; flagEmoji: string };

type PickRates = {
  totalSubmissions: number;
  picksByPlayerId: Map<number, number>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  team: Team;
  teamCode: string;
  starters: Player[];
  bench: Player[];
  pickRates: PickRates;
};

const MIN_SUBMISSIONS_FOR_TAGS = 5;

export function SubmittedModal({
  open,
  onClose,
  team,
  teamCode,
  starters,
  bench,
  pickRates,
}: Props) {
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareUrl = typeof window === "undefined" ? "" : window.location.origin;

  React.useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const squad = [...starters, ...bench];
  const squadAvg = computeAverages(squad);

  const tagsEnabled = pickRates.totalSubmissions >= MIN_SUBMISSIONS_FOR_TAGS;
  const { mostConventional, mostBold } = React.useMemo(() => {
    if (!tagsEnabled || starters.length === 0) {
      return { mostConventional: null, mostBold: null };
    }
    const totals = pickRates.totalSubmissions;
    let high: { player: Player; rate: number } | null = null;
    let low: { player: Player; rate: number } | null = null;
    for (const p of starters) {
      const rate = (pickRates.picksByPlayerId.get(p.id) ?? 0) / totals;
      if (!high || rate > high.rate) high = { player: p, rate };
      if (!low || rate < low.rate) low = { player: p, rate };
    }
    return {
      mostConventional: high?.player ?? null,
      mostBold: low?.player ?? null,
    };
  }, [starters, pickRates, tagsEnabled]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-xl border-border bg-surface text-foreground"
    >
      <div className="px-5 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
          <div className="flex shrink-0 items-center gap-1 text-5xl leading-none sm:text-6xl" aria-hidden>
            <span>🏆</span>
            <span>{team.flagEmoji}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Squad Submitted!
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="Average Age" value={formatAge(squadAvg.age)} />
          <Stat label="Avg Player Market Value" value={formatEur(squadAvg.value)} />
          <Stat
            label="Most Conventional Pick"
            value={mostConventional ? lastName(mostConventional.fullName) : null}
            placeholder="Need 5+ lineups"
          />
          <Stat
            label="Most Bold Pick"
            value={mostBold ? lastName(mostBold.fullName) : null}
            placeholder="Need 5+ lineups"
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCopy}
            disabled={!shareUrl}
            className={cn(
              "w-full transition-colors",
              copied && "bg-emerald-600 hover:bg-emerald-600",
            )}
            aria-live="polite"
          >
            {copied ? "✓ Copied — paste anywhere" : "Share with a Friend!"}
          </Button>
          <Link href={`/${teamCode}/crowd`} className="w-full">
            <Button variant="secondary" size="lg" className="w-full">
              View {team.name} Stats
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string | null;
  placeholder?: string;
}) {
  const display = value ?? placeholder ?? "—";
  const isPlaceholder = value == null;
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-3 text-center">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate text-base font-semibold",
          isPlaceholder ? "text-muted" : "text-foreground",
        )}
      >
        {display}
      </div>
    </div>
  );
}

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}
