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
};

export const COUNTRY_TILE_BASE =
  "rounded-lg border bg-[#cecaca] text-black transition";
export const COUNTRY_TILE_ENABLED =
  "border-zinc-800 hover:border-blue-500 hover:bg-[#B91C1C] hover:text-white";
export const COUNTRY_TILE_DISABLED =
  "cursor-not-allowed border-zinc-800 opacity-50";

export function CountryTile({
  code,
  name,
  flagEmoji,
  enabled,
  layout = "card",
  size = "md",
  borderless = false,
  className,
}: Props) {
  const surface = borderless
    ? "rounded-lg border-0 bg-[#cecaca] text-black transition"
    : COUNTRY_TILE_BASE;
  const enabledSurface = borderless
    ? "hover:bg-[#B91C1C] hover:text-white"
    : COUNTRY_TILE_ENABLED;
  const disabledSurface = borderless
    ? "cursor-not-allowed opacity-50"
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
        <span className="truncate text-base font-medium">{name}</span>
      </div>
    ) : (
      <div
        className={cn(
          surface,
          "flex flex-col items-center justify-center gap-1 px-3 text-center",
          size === "lg" ? "h-28 gap-2 rounded-xl" : "h-24",
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
        <span
          className={cn(
            "font-semibold leading-tight",
            size === "lg" ? "text-base" : "text-xs",
          )}
        >
          {name}
        </span>
        {!enabled && (
          <span className="text-[10px] uppercase tracking-wide">
            Roster coming soon
          </span>
        )}
      </div>
    );

  if (!enabled) return inner;

  return (
    <Link
      href={`/${code}/build`}
      aria-label={`Build the ${name} XI`}
      className="block text-black no-underline"
    >
      {inner}
    </Link>
  );
}
