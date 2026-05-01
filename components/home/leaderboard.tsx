import type { HomeLeaderboard } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

type Props = {
  data: HomeLeaderboard;
};

export function Leaderboard({ data }: Props) {
  if (data.totalSubmissions === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-2xl font-semibold text-black">Crowd Favorites</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <PlayersCard players={data.topPlayers} />
        <CountriesCard countries={data.topCountries} />
        <FormationsCard formations={data.topFormations} />
      </div>
    </section>
  );
}

const cardShellClass =
  "border-[rgba(207,202,202,1)] bg-[rgba(207,202,202,1)]";

function Card({
  title,
  children,
  bodyClassName,
}: {
  title: string;
  children?: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl border p-3 text-black",
        cardShellClass,
      )}
    >
      <h3 className="mb-2 shrink-0 text-[1.3125rem] font-semibold leading-tight">
        {title}
      </h3>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </div>
  );
}

function PlayersCard({ players }: { players: HomeLeaderboard["topPlayers"] }) {
  if (players.length === 0) return <Card title="Most Featured Players" />;
  const [hero, ...rest] = players;
  return (
    <Card title="Most Featured Players">
      <div className="flex flex-col items-center gap-1.5 pb-2">
        <PlayerAvatar player={hero.player} size="lg" />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">
            {formatPlayerName(hero.player.fullName)}
          </span>
          <span className="text-sm font-semibold">{formatRate(hero.rate)}</span>
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="space-y-1.5 border-t border-zinc-800 pt-2">
          {rest.map(({ player, rate }) => (
            <li key={player.id} className="flex items-center gap-2">
              <PlayerAvatar player={player} size="sm" />
              <span className="flex-1 truncate text-sm">
                {formatPlayerName(player.fullName)}
              </span>
              <span className="text-sm">{formatRate(rate)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CountriesCard({ countries }: { countries: HomeLeaderboard["topCountries"] }) {
  if (countries.length === 0) return <Card title="Country Leaderboard" />;
  const [hero, ...rest] = countries;
  return (
    <Card title="Country Leaderboard">
      <div className="flex flex-col items-center gap-1.5 pb-2">
        <FlagTile flag={hero.team.flagEmoji} size="lg" />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{hero.team.name}</span>
          <span className="text-sm font-semibold">{formatRate(hero.rate)}</span>
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="space-y-1.5 border-t border-zinc-800 pt-2">
          {rest.map(({ team, rate }) => (
            <li key={team.code} className="flex items-center gap-2">
              <FlagTile flag={team.flagEmoji} size="sm" />
              <span className="flex-1 truncate text-sm">{team.name}</span>
              <span className="text-sm">{formatRate(rate)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FormationsCard({ formations }: { formations: HomeLeaderboard["topFormations"] }) {
  if (formations.length === 0) return <Card title="Popular Formations" />;
  const [hero, ...rest] = formations;
  return (
    <Card title="Popular Formations" bodyClassName="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <FormationRow key={hero.name} formation={hero} index={0} rowTag="div" />
      </div>
      {rest.length > 0 && (
        <ul className="mt-1.5 shrink-0 space-y-1.5 border-t border-zinc-800 pt-2">
          {rest.map((f, i) => (
            <FormationRow key={f.name} formation={f} index={i + 1} rowTag="li" />
          ))}
        </ul>
      )}
    </Card>
  );
}

function FormationRow({
  formation,
  index,
  rowTag: RowTag,
}: {
  formation: HomeLeaderboard["topFormations"][number];
  index: number;
  rowTag: "li" | "div";
}) {
  const isHero = index === 0;
  return (
    <RowTag
      className={cn(
        "flex w-full items-center",
        isHero ? "gap-6 text-[1.75rem] leading-tight" : "gap-3 text-sm",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center leading-none",
          isHero ? "h-12 w-12 text-4xl" : "h-6 w-6 text-base",
        )}
      >
        {rankGlyph(index)}
      </span>
      <span className={cn("flex-1 truncate", isHero && "font-semibold")}>
        {formation.name}
      </span>
      <span className="shrink-0">{formatRate(formation.rate)}</span>
    </RowTag>
  );
}

function PlayerAvatar({
  player,
  size,
}: {
  player: { fullName: string; photoUrl: string | null };
  size: "lg" | "sm";
}) {
  const dimensions =
    size === "lg" ? "h-20 w-20 text-base" : "h-7 w-7 text-[10px]";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-400 bg-zinc-100 font-semibold text-black",
        dimensions,
      )}
    >
      {player.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.photoUrl}
          alt={player.fullName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        getInitials(player.fullName)
      )}
    </div>
  );
}

function FlagTile({ flag, size }: { flag: string; size: "lg" | "sm" }) {
  const dimensions =
    size === "lg" ? "h-16 w-24 text-4xl" : "h-5 w-7 text-base";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center leading-none",
        dimensions,
      )}
      aria-hidden
    >
      {flag}
    </div>
  );
}

function rankGlyph(index: number): React.ReactNode {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return <span className="block h-3 w-3 rounded-sm bg-zinc-700" aria-hidden />;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatPlayerName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
