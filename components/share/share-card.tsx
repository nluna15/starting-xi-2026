"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { SoccerPitch, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import type { Player } from "@/lib/db/schema";
import type { FormationDef } from "@/lib/formations";
import type { BadgeKind } from "@/components/community/recent-submission-tags";
import { computeAverages } from "@/components/lineup-summary";
import { formatAge, formatEur, lastName, proxyPhotoUrl } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   ShareCard — canonical 1080x1350 portrait export layout.
   Renders into an off-screen container by `useShareImage` and is then captured
   to a PNG by modern-screenshot. All sizes are absolute pixels (no responsive
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
   * Pre-resolved background image src. When provided (typically a data URI),
   * it replaces the `/lineup-background.png` path. Pre-fetching to a data URI
   * is the only reliable way to keep the decorative bg in the captured PNG —
   * same-origin <img> inlining inside SVG foreignObject is flaky.
   */
  backgroundSrc?: string;
  /** Pre-resolved pitch image src (data URI). Same rationale as backgroundSrc. */
  pitchSrc?: string;
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
const STATS_STRIP_HEIGHT = 110;
const FOOTER_HEIGHT = 60;

// Explicit pixel height so the bottom edge is independently tunable; the CSS
// override below forces the soccer-pitch package's inner container to match.
const PITCH_INNER_WIDTH = 840;
const PITCH_INNER_HEIGHT = 788;

// Pitch PNG is rendered 10% larger than the SoccerPitch container so the field
// markings grow without affecting player token positions (which are %-based
// against PITCH_INNER_WIDTH/HEIGHT).
const PITCH_IMAGE_WIDTH = Math.round(PITCH_INNER_WIDTH * 1.1);
const PITCH_IMAGE_HEIGHT = Math.round(PITCH_INNER_HEIGHT * 1.1);

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
  backgroundSrc,
  pitchSrc,
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

  // Lifts every STARTING player up by this many percentage points of the
  // pitch height. Bench players are unaffected (they use a separate list).
  // Positive = up, negative = down. 0 = no change.
  const PLAYER_Y_LIFT = 8;
  const pkgFormation = {
    name: formation.name,
    slots: formation.slots.map((s) => ({
      x: s.x,
      y: 100 - s.y - PLAYER_Y_LIFT,
      role: s.slot,
    })),
  };
  const pkgPlayers = starters.map(toPkgPlayer);
  const pkgBench = bench.map(toPkgPlayer);

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
        // The capture lib's clone strips inherited custom properties from
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
        /* Hide the package's pitch surface SVG — its tilt is faked with a
           rotateX(40deg) that modern-screenshot drops during capture. We
           render a flat pre-rendered PNG (share-pitch.png) underneath instead. */
        .${scopeClass} .sp-pitch-surface {
          display: none !important;
        }
        /* Pin the package's inner field container to our explicit height so
           player tokens (positioned by % within this container) line up with
           the PNG pitch underneath. */
        .${scopeClass} .sp-soccer-pitch > div:first-of-type {
          aspect-ratio: auto !important;
          height: ${PITCH_INNER_HEIGHT}px !important;
        }
        .${scopeClass} .sp-soccer-pitch .sp-bench {
          margin-top: 25px !important;
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
          /* Package sets opacity: .65; restore full opacity so the white pill
             below isn't washed out by the parent fade. */
          opacity: 1 !important;
        }
        .${scopeClass} .sp-soccer-pitch .sp-bench-title::before {
          content: "Impact substitutes";
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          display: inline-block;
          background: #ffffff;
          padding: 6px 18px;
          border-radius: 8px;
        }
        .${scopeClass} .sp-soccer-pitch .sp-pointer-events-auto {
          pointer-events: none !important;
        }
      `}</style>

      {/* Decorative kaleidoscope background — sits above the white root bg
          and below all foreground content via DOM order on positioned siblings.
          The capture flow pre-fetches this as a data URI (see useShareImage)
          because foreignObject inlining of same-origin <img> elements is
          unreliable across browsers. */}
      <img
        src={backgroundSrc ?? "/lineup-background.png"}
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

      {/* Stats strip — 3 tiles */}
      <div
        style={{
          height: STATS_STRIP_HEIGHT,
          marginTop: 40,
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
          padding: "10px 0 0 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* Outer wrapper matches the pitch image so the larger PNG never
            relies on overflowing a narrower parent (which the capture lib
            can clip on the left). Player layer below is constrained to
            PITCH_INNER_WIDTH and centered inside this wrapper so positions
            stay anchored. */}
        <div style={{ width: PITCH_IMAGE_WIDTH, position: "relative" }}>
          {/* Pre-rendered tilted pitch PNG. Replaces the soccer-pitch
              package's tilted SVG surface (hidden via CSS above) — the
              package fakes its tilt with rotateX(40deg), which the capture
              lib drops. Pre-fetched to a data URI in useShareImage. */}
          <img
            src={pitchSrc ?? "/share-pitch.png"}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              top: (PITCH_INNER_HEIGHT - PITCH_IMAGE_HEIGHT) / 2,
              left: 0,
              width: PITCH_IMAGE_WIDTH,
              height: PITCH_IMAGE_HEIGHT,
              objectFit: "fill",
              filter: "drop-shadow(0 24px 28px rgba(0, 0, 0, 0.35))",
              pointerEvents: "none",
            }}
          />
          {/* Player layer — constrained to PITCH_INNER_WIDTH and centered
              within the wider wrapper so percentage-based slot positions
              don't move when the pitch image grows. */}
          <div
            style={{
              width: PITCH_INNER_WIDTH,
              marginLeft: (PITCH_IMAGE_WIDTH - PITCH_INNER_WIDTH) / 2,
              position: "relative",
            }}
          >
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
