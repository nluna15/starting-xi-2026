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

function Card({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-100">{title}</h3>
      {children}
    </div>
  );
}

function PlayersCard({ players }: { players: HomeLeaderboard["topPlayers"] }) {
  if (players.length === 0) return <Card title="Most Featured Players" />;
  const [hero, ...rest] = players;
  return (
    <Card title="Most Featured Players">
      <div className="flex flex-col items-center gap-2 pb-3">
        <PlayerAvatar player={hero.player} size="lg" />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-zinc-100">
            {formatPlayerName(hero.player.fullName)}
          </span>
          <span className="text-sm font-semibold text-zinc-300">
            {formatRate(hero.rate)}
          </span>
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="space-y-2 border-t border-zinc-800 pt-3">
          {rest.map(({ player, rate }) => (
            <li key={player.id} className="flex items-center gap-2">
              <PlayerAvatar player={player} size="sm" />
              <span className="flex-1 truncate text-sm text-zinc-100">
                {formatPlayerName(player.fullName)}
              </span>
              <span className="text-sm text-zinc-300">{formatRate(rate)}</span>
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
      <div className="flex flex-col items-center gap-2 pb-3">
        <FlagTile flag={hero.team.flagEmoji} size="lg" />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-zinc-100">
            {hero.team.name}
          </span>
          <span className="text-sm font-semibold text-zinc-300">
            {formatRate(hero.rate)}
          </span>
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="space-y-2 border-t border-zinc-800 pt-3">
          {rest.map(({ team, rate }) => (
            <li key={team.code} className="flex items-center gap-2">
              <FlagTile flag={team.flagEmoji} size="sm" />
              <span className="flex-1 truncate text-sm text-zinc-100">{team.name}</span>
              <span className="text-sm text-zinc-300">{formatRate(rate)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FormationsCard({ formations }: { formations: HomeLeaderboard["topFormations"] }) {
  if (formations.length === 0) return <Card title="Popular Formations" />;
  return (
    <Card title="Popular Formations">
      <ul className="space-y-2">
        {formations.map((f, i) => (
          <li key={f.name} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center text-base leading-none">
              {rankGlyph(i)}
            </span>
            <span className="flex-1 truncate text-sm text-zinc-100">{f.name}</span>
            <span className="text-sm text-zinc-300">{formatRate(f.rate)}</span>
          </li>
        ))}
      </ul>
    </Card>
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
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 font-semibold text-zinc-200",
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
        "flex shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 leading-none",
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
