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
    <Link href={href} aria-label="All nations" className="block">
      <div
        className={cn(
          "rounded-lg border-0 bg-[#cecaca] text-black transition",
          "hover:bg-[#B91C1C] hover:text-white",
          "flex h-14 items-center justify-center px-3 text-base font-medium",
        )}
      >
        🌍 All nations
      </div>
    </Link>
  );
}
