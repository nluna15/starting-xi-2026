import { Card } from "@/components/ui/card";
import {
  SquadStatMarkerLayer,
  type InteractiveMarker,
} from "@/components/squad-stat-marker-layer";
import { computeMarkerAxisRange } from "@/lib/marker-axis-range";
import { cn, formatAge } from "@/lib/utils";

type SquadAgeBarProps = {
  countryAge: number | null;
  countryEmoji: string;
  countryCode: string;
  globalAvgAge: number | null;
  userAge: number | null;
  className?: string;
};

type Marker = {
  kind: InteractiveMarker["kind"];
  emoji: string;
  age: number;
};

const LABEL_ROW_HEIGHT_PX = 18;
// Hard rule: gradient green peak is anchored to this age regardless of bar
// endpoints. Yellow/red flank symmetrically; out-of-range stops clamp to the
// bar edges so very young or very old squads degrade cleanly.
const GREEN_PEAK_AGE = 26.5;
const YELLOW_OFFSET_YEARS = 3;
const RED_OFFSET_YEARS = 6;
const MINOR_TICK_HEIGHT_PX = 4;
const MAJOR_TICK_HEIGHT_PX = 8;
const MAJOR_LABEL_ENDPOINT_PADDING_PCT = 8;
// Tight axis: low/high ends track the marker neighborhood. Floor keeps a
// minimum context band so an isolated pair of markers doesn't render on a
// near-zero range.
const AGE_RANGE_FLOOR_YEARS = 1;
const AGE_SNAP_YEARS = 0.5;
const COLOR_RED = "#dc2626";
const COLOR_YELLOW = "#eab308";
const COLOR_GREEN = "#16a34a";

// Tick density scales with how tight we've zoomed. Wide ranges (>10y) get
// the classic 5y/1y rhythm; tight ranges break down to half- and tenth-year
// increments so the bar still has 4–8 ticks of visual texture.
function pickAgeTickIntervals(range: number): { major: number; minor: number } {
  if (range >= 10) return { major: 5, minor: 1 };
  if (range >= 4) return { major: 2, minor: 0.5 };
  if (range >= 1.5) return { major: 1, minor: 0.5 };
  return { major: 0.5, minor: 0.1 };
}

function prefixFor(kind: Marker["kind"], countryCode: string): string {
  if (kind === "user") return "Your picks";
  if (kind === "global") return "Global Teams";
  return `${countryCode.toUpperCase()} avg`;
}

export function SquadAgeBar({
  countryAge,
  countryEmoji,
  countryCode,
  globalAvgAge,
  userAge,
  className,
}: SquadAgeBarProps) {
  const raw: Array<Marker | null> = [
    countryAge != null
      ? { kind: "country", emoji: countryEmoji, age: countryAge }
      : null,
    globalAvgAge != null
      ? { kind: "global", emoji: "🌍", age: globalAvgAge }
      : null,
    userAge != null ? { kind: "user", emoji: "📍", age: userAge } : null,
  ];
  const rawMarkers = raw.filter((m): m is Marker => m !== null);

  const { min: minAge, max: maxAge } = computeMarkerAxisRange({
    values: rawMarkers.map((m) => m.age),
    minRangeFloor: AGE_RANGE_FLOOR_YEARS,
    snapTo: AGE_SNAP_YEARS,
  });

  const pct = (age: number) =>
    Math.min(100, Math.max(0, ((age - minAge) / (maxAge - minAge)) * 100));

  const interactiveMarkers: InteractiveMarker[] = rawMarkers.map((m) => {
    const prefix = prefixFor(m.kind, countryCode);
    const value = `${formatAge(m.age)} y`;
    return {
      kind: m.kind,
      emoji: m.emoji,
      pct: pct(m.age),
      prefixLabel: prefix,
      valueLabel: value,
      ariaLabel: `${prefix}: ${value}`,
    };
  });

  const { major: majorIntervalYears, minor: minorIntervalYears } =
    pickAgeTickIntervals(maxAge - minAge);
  const firstTickAge =
    Math.ceil(minAge / minorIntervalYears) * minorIntervalYears;
  const lastTickAge =
    Math.floor(maxAge / minorIntervalYears) * minorIntervalYears;
  const ticks: Array<{ age: number; pct: number; major: boolean }> = [];
  for (let a = firstTickAge; a <= lastTickAge + 1e-9; a += minorIntervalYears) {
    const rounded = Math.round(a * 10) / 10;
    ticks.push({
      age: rounded,
      pct: pct(rounded),
      major:
        Math.abs(
          rounded / majorIntervalYears -
            Math.round(rounded / majorIntervalYears),
        ) < 1e-6,
    });
  }
  const majorTickLabels = ticks.filter(
    (t) =>
      t.major &&
      t.pct >= MAJOR_LABEL_ENDPOINT_PADDING_PCT &&
      t.pct <= 100 - MAJOR_LABEL_ENDPOINT_PADDING_PCT,
  );

  const stopPct = (age: number) =>
    Math.min(100, Math.max(0, ((age - minAge) / (maxAge - minAge)) * 100));
  const gradientStops = [
    { color: COLOR_RED, pct: stopPct(GREEN_PEAK_AGE - RED_OFFSET_YEARS) },
    { color: COLOR_YELLOW, pct: stopPct(GREEN_PEAK_AGE - YELLOW_OFFSET_YEARS) },
    { color: COLOR_GREEN, pct: stopPct(GREEN_PEAK_AGE) },
    { color: COLOR_YELLOW, pct: stopPct(GREEN_PEAK_AGE + YELLOW_OFFSET_YEARS) },
    { color: COLOR_RED, pct: stopPct(GREEN_PEAK_AGE + RED_OFFSET_YEARS) },
  ];
  const gradient = `linear-gradient(to right, ${gradientStops
    .map((s) => `${s.color} ${s.pct}%`)
    .join(", ")})`;

  return (
    <Card padding="default" className={cn("gap-1", className)}>
      <h2 className="cond text-[13px] text-ink border-b border-line pb-1">
        Squad Age
      </h2>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-1">
        <div className="col-start-2 row-start-1 -mb-2">
          <SquadStatMarkerLayer markers={interactiveMarkers} />
        </div>

        <span className="col-start-1 row-start-2 text-[13px] text-ink-faint tabular-nums">
          {minAge} y
        </span>
        <div
          className="col-start-2 row-start-2 h-[6px] rounded-full"
          style={{ background: gradient }}
        />
        <span className="col-start-3 row-start-2 text-[13px] text-ink-faint tabular-nums">
          {maxAge} y
        </span>

        {ticks.length > 0 && (
          <div
            className="relative col-start-2 row-start-3"
            style={{ height: MAJOR_TICK_HEIGHT_PX }}
          >
            {ticks.map((t) => (
              <div
                key={t.age}
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
                key={`mt-${t.age}`}
                className="absolute top-0 text-[12px] text-ink-faint tabular-nums"
                style={{
                  left: `${t.pct}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {t.age}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
