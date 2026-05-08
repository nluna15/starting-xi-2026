"use client";

import * as React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat";
import { BuildPitch } from "@/components/build-pitch";
import { computeAverages } from "@/components/lineup-summary";
import type { Player } from "@/lib/db/schema";
import type { FormationDef } from "@/lib/formations";
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
  formation: FormationDef;
  starters: Player[];
  bench: Player[];
  pickRates: PickRates;
};

const MIN_SUBMISSIONS_FOR_TAGS = 5;

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function SubmittedModal({
  open,
  onClose,
  team,
  teamCode,
  formation,
  starters,
  bench,
  pickRates,
}: Props) {
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureRef = React.useRef<HTMLDivElement>(null);
  const shareUrl = typeof window === "undefined" ? "" : window.location.origin;

  React.useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function handleDownload() {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${team.name.replace(/\s+/g, "-").toLowerCase()}-lineup.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silently ignore export errors
    } finally {
      setDownloading(false);
    }
  }

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
      ariaLabel="Squad submitted"
      className="max-w-xl xl:max-w-4xl"
    >
      <div className="px-5 py-6 sm:px-7 sm:py-8 xl:flex xl:gap-8 xl:items-start">
        {/* Left column: header, stats, buttons */}
        <div className="xl:flex xl:flex-col xl:flex-1 xl:min-w-0">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
            <div className="flex shrink-0 items-center gap-1 text-5xl leading-none sm:text-6xl" aria-hidden>
              <span>🏆</span>
              <span>{team.flagEmoji}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
                Squad submitted
              </span>
              <h2 className="display text-[32px] text-ink leading-[0.95] sm:text-[40px]">
                Nice XI!
              </h2>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatTile
              label="Average Age"
              value={formatAge(squadAvg.age)}
              size="md"
              align="start"
            />
            <StatTile
              label="Avg Player Value"
              value={formatEur(squadAvg.value)}
              size="md"
              align="start"
            />
            <StatTile
              label="Avg Int'l Caps"
              value={formatAge(squadAvg.caps)}
              size="md"
              align="start"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PlayerStat
              label="Most Conventional Pick"
              player={mostConventional}
              placeholder="Need 5+ lineups"
            />
            <PlayerStat
              label="Most Bold Pick"
              player={mostBold}
              placeholder="Need 5+ lineups"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full"
            >
              {downloading ? "Saving…" : "Download Image"}
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleCopy}
              disabled={!shareUrl}
              className={cn("w-full", copied && "bg-success hover:bg-success")}
              aria-live="polite"
            >
              {copied ? "✓ Copied — paste anywhere" : "Share with a Friend!"}
            </Button>
            <Link href={`/community/${teamCode}`} className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                View {team.name} Stats
              </Button>
            </Link>
          </div>
        </div>

        {/* Right column: pitch image card */}
        <div
          ref={captureRef}
          className="mt-6 xl:mt-0 xl:w-[55%] xl:shrink-0 overflow-hidden rounded-lg bg-white"
          style={
            {
              // html-to-image's clone strips CSS custom properties from
              // computed styles, so the soccer-pitch package's grass-theme
              // vars (consumed by SVG fill="var(...)") would resolve to
              // nothing in the export. Inline them here so they survive.
              "--sp-pitch-grass-1": "#2f8a3f",
              "--sp-pitch-grass-2": "#2a7d39",
              "--sp-pitch-line": "rgba(255, 255, 255, 0.85)",
              "--sp-player-bg": "#ffffff",
              "--sp-player-ring": "#ffffff",
              "--sp-player-initials": "#1a1a1a",
              "--sp-name-bg": "rgba(0, 0, 0, 0.78)",
              "--sp-name-fg": "#ffffff",
            } as React.CSSProperties
          }
        >
          <div className="px-4 pt-3 pb-1 grid grid-cols-3 items-center">
            <span className="mono text-[11px] font-medium tracking-[0.14em] text-emerald-900 uppercase inline-flex items-center gap-1.5">
              <span className="text-[22px] leading-none">{team.flagEmoji}</span>
              {team.name}
            </span>
            <span className="mono text-[11px] font-bold tracking-[0.18em] text-emerald-700/60 uppercase text-center">
              STARTINGXI2026.APP
            </span>
            <span className="mono text-[11px] font-bold tracking-[0.1em] text-emerald-900 text-right">
              {formation.name}
            </span>
          </div>
          <div className="px-3 pb-3 flex justify-center">
            <div className="w-[85%] sp-modal-pitch">
              <style>{`.sp-modal-pitch .sp-bench { margin-top: 30px !important; padding-bottom: 5px !important; } .sp-modal-pitch .sp-bench-title { margin-bottom: 10px !important; font-size: 0 !important; } .sp-modal-pitch .sp-bench-title::before { content: "Impact substitutes"; font-size: 11px; } .sp-modal-pitch .sp-bench-row { height: 44px !important; } .sp-modal-pitch .sp-pointer-events-auto { pointer-events: none !important; }`}</style>
              <BuildPitch
                formation={formation}
                starters={starters}
                bench={bench}
                showPhotos
                shortenNames
                avatarSize={38}
                avatarNameGap={4}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PlayerStat({
  label,
  player,
  placeholder,
}: {
  label: string;
  player: Player | null;
  placeholder?: string;
}) {
  return (
    <Card padding="default" className="text-left">
      <span className="cond text-[12px] text-ink-3">{label}</span>
      {player ? (
        <div className="mt-1 flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 text-[11px] font-semibold text-ink-3">
            {player.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.photoUrl}
                alt={player.fullName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              getInitials(player.fullName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-tight text-ink">
              {player.fullName}
            </div>
            <div className="mono text-[11px] tracking-[0.08em] text-ink-3">
              {player.position}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-[13px] text-ink-faint">{placeholder ?? "—"}</div>
      )}
    </Card>
  );
}
