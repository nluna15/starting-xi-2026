import { Card } from "@/components/ui/card";
import {
  SquadStatMarkerLayer,
  type InteractiveMarker,
} from "@/components/squad-stat-marker-layer";
import { computeMarkerAxisRange } from "@/lib/marker-axis-range";
import { cn } from "@/lib/utils";

type SquadValueBarProps = {
  countryValue: number | null;
  countryEmoji: string;
  countryCode: string;
  globalValue: number | null;
  userValue: number | null;
  className?: string;
};

type Marker = {
  kind: InteractiveMarker["kind"];
  emoji: string;
  value: number;
};

const LABEL_ROW_HEIGHT_PX = 18;
// Gradient anchored to absolute EUR market value: a €50M player always reads
// green regardless of squad composition.
const RED_AT_VALUE = 0;
const YELLOW_AT_VALUE = 15_000_000;
const GREEN_AT_VALUE = 50_000_000;
const COLOR_RED = "#dc2626";
const COLOR_YELLOW = "#eab308";
const COLOR_GREEN = "#16a34a";
const MINOR_TICK_HEIGHT_PX = 4;
const MAJOR_TICK_HEIGHT_PX = 8;
const MAJOR_LABEL_ENDPOINT_PADDING_PCT = 10;
const VALUE_RANGE_FLOOR = 2_000_000;
const EDGE_PAD_FRACTION = 0.12;

const formatValue = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `€${m.toFixed(m >= 10 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `€${Math.round(value / 1_000)}K`;
  }
  return `€${Math.round(value)}`;
};

// Hardcoded "nice" intervals keyed off the range. Major ÷ minor is always 5,
// so every fifth minor tick is automatically a major. Keeps tick labels at
// recognizable rounds (5M, 25M, 50M, etc.) instead of mid-fractions.
function pickTickIntervals(range: number): { major: number; minor: number } {
  if (range >= 200_000_000) return { major: 100_000_000, minor: 20_000_000 };
  if (range >= 80_000_000) return { major: 50_000_000, minor: 10_000_000 };
  if (range >= 40_000_000) return { major: 25_000_000, minor: 5_000_000 };
  if (range >= 20_000_000) return { major: 10_000_000, minor: 2_000_000 };
  if (range >= 8_000_000) return { major: 5_000_000, minor: 1_000_000 };
  if (range >= 4_000_000) return { major: 2_000_000, minor: 500_000 };
  if (range >= 2_000_000) return { major: 1_000_000, minor: 200_000 };
  if (range >= 800_000) return { major: 500_000, minor: 100_000 };
  if (range >= 400_000) return { major: 200_000, minor: 50_000 };
  if (range >= 200_000) return { major: 100_000, minor: 20_000 };
  return { major: 50_000, minor: 10_000 };
}

function prefixFor(kind: Marker["kind"], countryCode: string): string {
  if (kind === "user") return "Your picks";
  if (kind === "global") return "Global Teams";
  return `${countryCode.toUpperCase()} avg`;
}

export function SquadValueBar({
  countryValue,
  countryEmoji,
  countryCode,
  globalValue,
  userValue,
  className,
}: SquadValueBarProps) {
  const raw: Array<Marker | null> = [
    countryValue != null
      ? { kind: "country", emoji: countryEmoji, value: countryValue }
      : null,
    globalValue != null
      ? { kind: "global", emoji: "🌍", value: globalValue }
      : null,
    userValue != null ? { kind: "user", emoji: "📍", value: userValue } : null,
  ];
  const rawMarkers = raw.filter((m): m is Marker => m !== null);

  // Two-pass snap selection: pick a snap interval from the candidate range
  // first, then feed it back to the axis solver so endpoints land on round
  // EUR figures appropriate to the zoom level.
  const markerValues = rawMarkers.map((m) => m.value);
  const candidateSpread = markerValues.length
    ? Math.max(...markerValues) - Math.min(...markerValues)
    : 0;
  const candidateRange = Math.max(
    candidateSpread / (1 - 2 * EDGE_PAD_FRACTION),
    VALUE_RANGE_FLOOR,
  );
  const { minor: valueSnap } = pickTickIntervals(candidateRange);
  const { min: minValue, max: maxValue } = computeMarkerAxisRange({
    values: markerValues,
    minRangeFloor: VALUE_RANGE_FLOOR,
    snapTo: valueSnap,
    edgePadFraction: EDGE_PAD_FRACTION,
  });

  const pct = (value: number) =>
    Math.min(
      100,
      Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100),
    );

  const interactiveMarkers: InteractiveMarker[] = rawMarkers.map((m) => {
    const prefix = prefixFor(m.kind, countryCode);
    const value = formatValue(m.value);
    return {
      kind: m.kind,
      emoji: m.emoji,
      pct: pct(m.value),
      prefixLabel: prefix,
      valueLabel: value,
      ariaLabel: `${prefix}: ${value}`,
    };
  });

  const stopPct = (value: number) =>
    Math.min(
      100,
      Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100),
    );
  const gradientStops = [
    { color: COLOR_RED, pct: stopPct(RED_AT_VALUE) },
    { color: COLOR_YELLOW, pct: stopPct(YELLOW_AT_VALUE) },
    { color: COLOR_GREEN, pct: stopPct(GREEN_AT_VALUE) },
  ];
  const gradient = `linear-gradient(to right, ${gradientStops
    .map((s) => `${s.color} ${s.pct}%`)
    .join(", ")})`;

  const { major: majorInterval, minor: minorInterval } = pickTickIntervals(
    maxValue - minValue,
  );
  const firstTick = Math.ceil(minValue / minorInterval) * minorInterval;
  const lastTick = Math.floor(maxValue / minorInterval) * minorInterval;
  const ticks: Array<{ value: number; pct: number; major: boolean }> = [];
  for (let v = firstTick; v <= lastTick; v += minorInterval) {
    ticks.push({
      value: v,
      pct: pct(v),
      major: v % majorInterval === 0,
    });
  }
  const majorTickLabels = ticks.filter(
    (t) =>
      t.major &&
      t.pct >= MAJOR_LABEL_ENDPOINT_PADDING_PCT &&
      t.pct <= 100 - MAJOR_LABEL_ENDPOINT_PADDING_PCT,
  );

  return (
    <Card padding="default" className={cn("gap-1", className)}>
      <h2 className="cond text-[13px] text-ink border-b border-line pb-1">
        Avg. Player Market Value
      </h2>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-1">
        <div className="col-start-2 row-start-1 -mb-2">
          <SquadStatMarkerLayer markers={interactiveMarkers} />
        </div>

        <span className="col-start-1 row-start-2 text-[13px] text-ink-faint tabular-nums">
          {formatValue(minValue)}
        </span>
        <div
          className="col-start-2 row-start-2 h-[6px] rounded-full"
          style={{ background: gradient }}
        />
        <span className="col-start-3 row-start-2 text-[13px] text-ink-faint tabular-nums">
          {formatValue(maxValue)}
        </span>

        {ticks.length > 0 && (
          <div
            className="relative col-start-2 row-start-3"
            style={{ height: MAJOR_TICK_HEIGHT_PX }}
          >
            {ticks.map((t) => (
              <div
                key={t.value}
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
                key={`mt-${t.value}`}
                className="absolute top-0 text-[12px] text-ink-faint tabular-nums"
                style={{
                  left: `${t.pct}%`,
                  transform: "translateX(-50%)",
                }}
              >
              {formatValue(t.value)}
            </span>
          ))}
          </div>
        )}
      </div>
    </Card>
  );
}
