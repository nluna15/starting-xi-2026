import Link from "next/link";
import { CountryTile } from "@/components/country-tile";
import { cn } from "@/lib/utils";

export type CarouselTile = {
  code: string;
  name: string;
  flagEmoji: string;
  enabled: boolean;
};

type Props = {
  tiles: CarouselTile[];
  viewAllHref: string;
};

export function NationCarousel({ tiles, viewAllHref }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tiles.map((tile) => (
        <li key={tile.code}>
          <CountryTile
            code={tile.code}
            name={tile.name}
            flagEmoji={tile.flagEmoji}
            enabled={tile.enabled}
            layout="row"
            borderless
          />
        </li>
      ))}
      <li>
        <ViewAllTile href={viewAllHref} />
      </li>
    </ul>
  );
}

function ViewAllTile({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="All nations"
      className={cn(
        "block rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
      )}
    >
      <div
        className={cn(
          // Match the row-layout CountryTile silhouette (h-14 + rounded-lg) so
          // the carousel reads as one rhythm.
          "flex h-14 items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 px-3",
          "cond text-[13px] font-bold text-ink",
          "transition-[background-color,border-color,color] duration-150 ease-in-out",
          "hover:border-accent hover:bg-accent-soft hover:text-accent-deep",
        )}
      >
        <span aria-hidden className="text-base leading-none">
          🌍
        </span>
        <span>All Nations</span>
      </div>
    </Link>
  );
}
