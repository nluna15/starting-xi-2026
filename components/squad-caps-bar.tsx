import { Card } from "@/components/ui/card";
import {
  SquadStatMarkerLayer,
  type InteractiveMarker,
} from "@/components/squad-stat-marker-layer";
import { computeMarkerAxisRange } from "@/lib/marker-axis-range";
import { cn } from "@/lib/utils";

type SquadCapsBarProps = {
  countryCaps: number | null;
  countryEmoji: string;
  countryCode: string;
  globalCaps: number | null;
  userCaps: number | null;
  className?: string;
};

type Marker = {
  kind: InteractiveMarker["kind"];
  emoji: string;
  caps: number;
};

const LABEL_ROW_HEIGHT_PX = 18;
// Single-direction gradient anchored to absolute cap counts: more caps = better.
// A player with 50 caps always reads green regardless of squad composition.
const RED_AT_CAPS = 0;
const YELLOW_AT_CAPS = 25;
const GREEN_AT_CAPS = 50;
const MINOR_TICK_HEIGHT_PX = 4;
const MAJOR_TICK_HEIGHT_PX = 8;
const MAJOR_LABEL_ENDPOINT_PADDING_PCT = 8;
const CAPS_RANGE_FLOOR = 5;
const CAPS_SNAP = 1;
const COLOR_RED = "#dc2626";
const COLOR_YELLOW = "#eab308";
const COLOR_GREEN = "#16a34a";

function pickCapsTickIntervals(range: number): { major: number; minor: number } {
  if (range >= 80) return { major: 25, minor: 5 };
  if (range >= 30) return { major: 10, minor: 5 };
  if (range >= 12) return { major: 5, minor: 1 };
  return { major: 2, minor: 1 };
}

const formatCaps = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  return Math.round(value).toString();
};

function prefixFor(kind: Marker["kind"], countryCode: string): string {
  if (kind === "user") return "Your picks";
  if (kind === "global") return "Global Teams";
  return `${countryCode.toUpperCase()} avg`;
}

export function SquadCapsBar({
  countryCaps,
  countryEmoji,
  countryCode,
  globalCaps,
  userCaps,
  className,
}: SquadCapsBarProps) {
  const raw: Array<Marker | null> = [
    countryCaps != null
      ? { kind: "country", emoji: countryEmoji, caps: countryCaps }
      : null,
    globalCaps != null
      ? { kind: "global", emoji: "🌍", caps: globalCaps }
      : null,
    userCaps != null ? { kind: "user", emoji: "📍", caps: userCaps } : null,
  ];
  const rawMarkers = raw.filter((m): m is Marker => m !== null);

  const { min: minCaps, max: maxCaps } = computeMarkerAxisRange({
    values: rawMarkers.map((m) => m.caps),
    minRangeFloor: CAPS_RANGE_FLOOR,
    snapTo: CAPS_SNAP,
  });

  const pct = (caps: number) =>
    Math.min(100, Math.max(0, ((caps - minCaps) / (maxCaps - minCaps)) * 100));

  const interactiveMarkers: InteractiveMarker[] = rawMarkers.map((m) => {
    const prefix = prefixFor(m.kind, countryCode);
    const value = formatCaps(m.caps);
    return {
      kind: m.kind,
      emoji: m.emoji,
      pct: pct(m.caps),
      prefixLabel: prefix,
      valueLabel: value,
      ariaLabel: `${prefix}: ${value} caps`,
    };
  });

  const { major: majorIntervalCaps, minor: minorIntervalCaps } =
    pickCapsTickIntervals(maxCaps - minCaps);
  const firstTick = Math.ceil(minCaps / minorIntervalCaps) * minorIntervalCaps;
  const lastTick = Math.floor(maxCaps / minorIntervalCaps) * minorIntervalCaps;
  const ticks: Array<{ caps: number; pct: number; major: boolean }> = [];
  for (let c = firstTick; c <= lastTick; c += minorIntervalCaps) {
    ticks.push({
      caps: c,
      pct: pct(c),
      major: c % majorIntervalCaps === 0,
    });
  }
  const majorTickLabels = ticks.filter(
    (t) =>
      t.major &&
      t.pct >= MAJOR_LABEL_ENDPOINT_PADDING_PCT &&
      t.pct <= 100 - MAJOR_LABEL_ENDPOINT_PADDING_PCT,
  );

  const stopPct = (caps: number) =>
    Math.min(100, Math.max(0, ((caps - minCaps) / (maxCaps - minCaps)) * 100));
  const gradientStops = [
    { color: COLOR_RED, pct: stopPct(RED_AT_CAPS) },
    { color: COLOR_YELLOW, pct: stopPct(YELLOW_AT_CAPS) },
    { color: COLOR_GREEN, pct: stopPct(GREEN_AT_CAPS) },
  ];
  const gradient = `linear-gradient(to right, ${gradientStops
    .map((s) => `${s.color} ${s.pct}%`)
    .join(", ")})`;

  return (
    <Card padding="default" className={cn("gap-1", className)}>
      <h2 className="cond text-[13px] text-ink border-b border-line pb-1">
        Avg. Int&rsquo;l Caps
      </h2>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-1">
        <div className="col-start-2 row-start-1 -mb-2">
          <SquadStatMarkerLayer markers={interactiveMarkers} />
        </div>

        <span className="col-start-1 row-start-2 text-[13px] text-ink-faint tabular-nums">
          {formatCaps(minCaps)}
        </span>
        <div
          className="col-start-2 row-start-2 h-[6px] rounded-full"
          style={{ background: gradient }}
        />
        <span className="col-start-3 row-start-2 text-[13px] text-ink-faint tabular-nums">
          {formatCaps(maxCaps)}
        </span>

        {ticks.length > 0 && (
          <div
            className="relative col-start-2 row-start-3"
            style={{ height: MAJOR_TICK_HEIGHT_PX }}
          >
            {ticks.map((t) => (
              <div
                key={t.caps}
                className="absolute top-0 bg-ink-faint"
                style={{
                  left: `${t.pct}%`,
                  width: 1,
                  height: t.major
                    ? MAJOR_TICK_HEIGHT_PX
                    : MINOR_TICK_HEIGHT_PX,
                  transform: "translateX(-0.5px)",
                }}
              />
            ))}
          </div>
        )}

        {majorTickLabels.length > 0 && (
          <div
            className="relative col-start-2 row-start-4"
            style={{ height: LABEL_ROW_HEIGHT_PX }}
          >
            {majorTickLabels.map((t) => (
              <span
                key={`mt-${t.caps}`}
                className="absolute top-0 text-[12px] text-ink-faint tabular-nums"
                style={{
                  left: `${t.pct}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {t.caps}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
