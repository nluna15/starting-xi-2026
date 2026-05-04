import Link from "next/link";
import { cn } from "@/lib/utils";

type Layout = "card" | "row";
type Size = "md" | "lg";

type Props = {
  code: string;
  name: string;
  flagEmoji: string;
  enabled: boolean;
  layout?: Layout;
  size?: Size;
  /** No outline border (e.g. home nation pickers). */
  borderless?: boolean;
  className?: string;
  /** Override the default `/{code}/build` link target. */
  hrefOverride?: string;
  /** Override the default aria-label. */
  ariaLabel?: string;
};

/* -----------------------------------------------------------------------------
   CountryTile — handoff §6 (cards) reskin.
   - Surface: `--surface-2`. Hairline `--line` (or borderless when the host
     provides its own rhythm — home nation pickers / community carousel).
   - Hover (enabled only): tint to `--accent-soft`, border to `--accent`,
     ink to `--accent-deep`. Mirrors the NationCarousel "All Nations" tile so
     the row reads as one rhythm.
   - Names are condensed uppercase per the editorial type system.
   ----------------------------------------------------------------------------- */
export const COUNTRY_TILE_BASE = cn(
  "rounded-md border bg-surface-2 text-ink",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-in-out",
);
export const COUNTRY_TILE_ENABLED = cn(
  "border-line",
  "hover:border-accent hover:bg-accent-soft hover:text-accent-deep",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft focus-visible:border-accent",
);
export const COUNTRY_TILE_DISABLED = "cursor-not-allowed border-line opacity-55";

export function CountryTile({
  code,
  name,
  flagEmoji,
  enabled,
  layout = "card",
  size = "md",
  borderless = false,
  className,
  hrefOverride,
  ariaLabel,
}: Props) {
  const surface = borderless
    ? cn(
        "rounded-md border-0 bg-surface-2 text-ink",
        "transition-[background-color,border-color,color] duration-150 ease-in-out",
      )
    : COUNTRY_TILE_BASE;
  const enabledSurface = borderless
    ? cn(
        "hover:bg-accent-soft hover:text-accent-deep",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
      )
    : COUNTRY_TILE_ENABLED;
  const disabledSurface = borderless
    ? "cursor-not-allowed opacity-55"
    : COUNTRY_TILE_DISABLED;

  const inner =
    layout === "row" ? (
      <div
        className={cn(
          surface,
          "flex h-14 items-center gap-2 px-3",
          enabled ? enabledSurface : disabledSurface,
          className,
        )}
      >
        <span className="text-xl leading-none" aria-hidden>
          {flagEmoji}
        </span>
        <span className="cond truncate text-[13px] font-bold">{name}</span>
      </div>
    ) : (
      <div
        className={cn(
          surface,
          "flex flex-col items-center justify-center gap-1 px-3 text-center",
          size === "lg" ? "h-28 gap-2 rounded-lg" : "h-24",
          enabled ? enabledSurface : disabledSurface,
          className,
        )}
      >
        <span
          className={cn(
            "leading-none",
            size === "lg" ? "text-4xl" : "text-2xl",
          )}
          aria-hidden
        >
          {flagEmoji}
        </span>
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={cn(
              "cond leading-tight",
              size === "lg" ? "text-[14px] font-bold" : "text-[12px] font-bold",
            )}
          >
            {name}
          </span>
          {!enabled && (
            <span className="mono text-[10px] tracking-[0.12em] text-ink-faint">
              Roster coming soon
            </span>
          )}
        </div>
      </div>
    );

  if (!enabled) return inner;

  return (
    <Link
      href={hrefOverride ?? `/${code}/build`}
      aria-label={ariaLabel ?? `Build the ${name} XI`}
      className="block rounded-md text-ink no-underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft"
    >
      {inner}
    </Link>
  );
}
