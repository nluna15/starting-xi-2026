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
  className,
}: Props) {
  const inner =
    layout === "row" ? (
      <div
        className={cn(
          COUNTRY_TILE_BASE,
          "flex h-14 items-center gap-2 px-3",
          enabled ? COUNTRY_TILE_ENABLED : COUNTRY_TILE_DISABLED,
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
          COUNTRY_TILE_BASE,
          "flex flex-col items-center justify-center gap-1 px-3 text-center",
          size === "lg" ? "h-28 gap-2 rounded-xl" : "h-24",
          enabled ? COUNTRY_TILE_ENABLED : COUNTRY_TILE_DISABLED,
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
    <Link href={`/${code}/build`} aria-label={`Build the ${name} XI`}>
      {inner}
    </Link>
  );
}
