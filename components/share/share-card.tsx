"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { Player } from "@/lib/db/schema";
import type { FormationDef } from "@/lib/formations";
import { BADGE_COLORS, type BadgeKind } from "@/components/community/recent-submission-tags";
import { computeAverages } from "@/components/lineup-summary";
import { formatAge, formatEur, lastName, proxyPhotoUrl } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   ShareCard — canonical 1080x1350 portrait export layout.
   Renders into an off-screen container by `useShareImage` and is then captured
   to a PNG by html-to-image. All sizes are absolute pixels (no responsive
   variants) so the rendered pixel buffer is identical regardless of the host
   viewport. Keep every text node legible at full export size.
   ----------------------------------------------------------------------------- */

export type ShareCardProps = {
  team: { name: string; flagEmoji: string };
  formation: FormationDef;
  starters: Player[];
  bench: Player[];
  category: { badge: BadgeKind } | null;
  /**
   * Called once after the React tree commits and layout is stable.
   * `useShareImage` uses this signal to wait for first paint before
   * collecting <img> nodes and decoding their bytes.
   */
  onReady?: () => void;
};

const SHARE_WIDTH = 1080;
const SHARE_HEIGHT = 1350;

const HEADER_HEIGHT = 96;
const BADGE_ROW_HEIGHT = 60;
const STATS_STRIP_HEIGHT = 110;
const FOOTER_HEIGHT = 60;

// soccer-pitch lays the pitch field out with `aspect-ratio: 4 / (5*cos40°) ≈ 4 / 3.83`
// (width-driven height). At width 740 the field resolves to ~708px tall, which
// places its bottom edge at y = 318 (top stack) + 708 = 1026 — exactly 95% of
// the 1080-wide canvas. That leaves the area below the field free for a fully
// visible bench + footer.
const PITCH_INNER_WIDTH = 740;

function toPkgPlayer(p: Player | null): PkgPlayer | null {
  if (!p) return null;
  return {
    id: String(p.id),
    name: lastName(p.fullName),
    photoUrl: proxyPhotoUrl(p.photoUrl) ?? undefined,
  };
}

export function ShareCard({
  team,
  formation,
  starters,
  bench,
  category,
  onReady,
}: ShareCardProps) {
  const rawId = React.useId();
  const scopeClass = `share-card-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  React.useLayoutEffect(() => {
    onReady?.();
    // onReady is captured at first commit on purpose — re-firing on prop changes
    // would re-trigger the capture flow mid-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const squad = [...starters, ...bench];
  const avg = computeAverages(squad);

  const pkgFormation = {
    name: formation.name,
    slots: formation.slots.map((s) => ({ x: s.x, y: 100 - s.y, role: s.slot })),
  };
  const pkgPlayers = starters.map(toPkgPlayer);
  const pkgBench = bench.map(toPkgPlayer);

  const badgeBg = category ? BADGE_COLORS[category.badge] : null;

  return (
    <div
      className={scopeClass}
      style={{
        width: SHARE_WIDTH,
        height: SHARE_HEIGHT,
        background: "#ffffff",
        color: "#0e0e10",
        position: "relative",
        overflow: "hidden",
        // Pin theme tokens consumed by the soccer-pitch package's SVGs.
        // html-to-image's clone strips inherited custom properties from
        // computed styles, so we inline them at the export root.
        ["--sp-pitch-grass-1" as string]: "#2f8a3f",
        ["--sp-pitch-grass-2" as string]: "#2a7d39",
        ["--sp-pitch-line" as string]: "rgba(255, 255, 255, 0.85)",
        ["--sp-player-bg" as string]: "#ffffff",
        ["--sp-player-ring" as string]: "#ffffff",
        ["--sp-player-initials" as string]: "#1a1a1a",
        ["--sp-name-bg" as string]: "rgba(0, 0, 0, 0.78)",
        ["--sp-name-fg" as string]: "#ffffff",
      }}
    >
      <style>{`
        .${scopeClass} .sp-soccer-pitch {
          /* Container is PITCH_INNER_WIDTH (740px); 13% preferred resolves
             to ~96px, comfortably inside the 92/120 min/max clamp. */
          --sp-dot-min: 92px !important;
          --sp-dot-preferred: 13% !important;
          --sp-dot-max: 120px !important;
          /* Bump player-name pill from the package default of 10px so names
             stay legible at the 1080px native export size. */
          --sp-name-fs: 24px !important;
        }
        .${scopeClass} .sp-soccer-pitch .sp-bench {
          margin-top: 100px !important;
          padding-bottom: 4px !important;
        }
        .${scopeClass} .sp-soccer-pitch .sp-bench-row {
          height: 140px !important;
        }
        .${scopeClass} .sp-soccer-pitch .sp-bench-title {
          color: #1a1a1a;
          font-size: 0 !important;
          margin-bottom: 1px !important;
          letter-spacing: 0.18em !important;
        }
        .${scopeClass} .sp-soccer-pitch .sp-bench-title::before {
          content: "Impact substitutes";
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .${scopeClass} .sp-soccer-pitch .sp-pointer-events-auto {
          pointer-events: none !important;
        }
      `}</style>

      {/* Decorative kaleidoscope background — sits above the white root bg
          and below all foreground content via DOM order on positioned siblings.
          Served from the same origin so html-to-image can capture it without
          tainting the canvas. */}
      <img
        src="/lineup-background.png"
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.33,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >

      {/* Header row — flag + team | wordmark | formation */}
      <div
        style={{
          height: HEADER_HEIGHT,
          padding: "0 56px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          alignItems: "center",
          background: "#ffffff",
          borderBottom: "1px solid #e1e0db",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <span style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>
            {team.flagEmoji}
          </span>
          <span
            style={{
              fontFamily: "var(--font-condensed), system-ui, sans-serif",
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#0e0e10",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {team.name}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "0.22em",
            color: "#5a5a63",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          STARTINGXI2026.APP
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "0.1em",
            color: "#0e0e10",
            textAlign: "right",
          }}
        >
          {formation.name}
        </div>
      </div>

      {/* Badge row — single category pill, centered */}
      <div
        style={{
          height: BADGE_ROW_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {category && badgeBg ? (
          <span
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "8px 22px",
              borderRadius: 999,
              background: badgeBg,
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            {category.badge}
          </span>
        ) : null}
      </div>

      {/* Stats strip — 3 tiles */}
      <div
        style={{
          height: STATS_STRIP_HEIGHT,
          padding: "0 56px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        <ShareStat label="Average Age" value={formatAge(avg.age)} />
        <ShareStat label="Average Caps" value={formatAge(avg.caps)} />
        <ShareStat label="Average Value" value={formatEur(avg.value)} />
      </div>

      {/* Pitch — narrower-than-canvas centered container so the field's
          aspect-ratio resolves to ~708px tall. With stats trimmed to 110px,
          the pitch top sits flush against the stats strip and the field
          bottom lands well above the bench. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: PITCH_INNER_WIDTH }}>
          {/* MotionConfig disables framer-motion animations so player tokens
              are positioned synchronously on commit, not after rAF. */}
          <MotionConfig reducedMotion="always" transition={{ duration: 0 }}>
            <SoccerPitch
              formation={pkgFormation}
              players={pkgPlayers}
              bench={pkgBench}
              theme="grass"
              showNames
              showFlags={false}
            />
          </MotionConfig>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          height: FOOTER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-condensed), system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#5a5a63",
          background: "#ffffff",
          borderTop: "1px solid #e1e0db",
        }}
      >
        Build your lineup at startingXI2026.app
      </div>

      </div>
    </div>
  );
}

function ShareStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        padding: "12px 22px",
        background: "#ffffff",
        border: "1px solid #e1e0db",
        borderRadius: 14,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-condensed), system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#5a5a63",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: "0.01em",
          color: "#0e0e10",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export const SHARE_CARD_DIMENSIONS = { width: SHARE_WIDTH, height: SHARE_HEIGHT } as const;
