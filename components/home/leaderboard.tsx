import type { HomeLeaderboard } from "@/lib/db/queries";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/section-heading";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   Crowd Favorites — three editorial cards listing the top players, countries,
   and formations.
   - Card heading: cond 13px ink with a hairline underline (handoff §6).
   - Numeric values use the `.mono` utility so percentages line up across rows.
   - Hero row gets a larger display value; subsequent rows are condensed names
     with mono percentages on the right rail.
   ----------------------------------------------------------------------------- */

type Props = {
  data: HomeLeaderboard;
};

export function Leaderboard({ data }: Props) {
  if (data.totalSubmissions === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeading title="Crowd Favorites" />
      <div className="grid gap-3 md:grid-cols-3">
        <PlayersCard players={data.topPlayers} />
        <CountriesCard countries={data.topCountries} />
        <FormationsCard formations={data.topFormations} />
      </div>
    </section>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="cond border-b border-line pb-2 text-[13px] font-bold text-ink">
      {children}
    </h3>
  );
}

function PlayersCard({ players }: { players: HomeLeaderboard["topPlayers"] }) {
  if (players.length === 0)
    return (
      <Card padding="hero" className="gap-3">
        <PanelHeading>Most Featured Players</PanelHeading>
      </Card>
    );
  const [hero, ...rest] = players;
  return (
    <Card padding="hero" className="gap-3">
      <PanelHeading>Most Featured Players</PanelHeading>
      <div className="flex flex-1 flex-col items-center gap-2 pb-1">
        <PlayerAvatar player={hero.player} size="lg" />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="cond truncate text-[13px] font-bold text-ink">
            {formatPlayerName(hero.player.fullName)}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {hero.team && (
              <span className="text-[13px] leading-none" aria-label={hero.team.name}>
                {hero.team.flagEmoji}
              </span>
            )}
            <span className="mono text-[14px] font-bold text-ink">
              {formatRate(hero.rate)}
            </span>
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-line pt-2">
          {rest.map(({ player, team, rate }) => (
            <li key={player.id} className="flex items-center gap-2">
              <PlayerAvatar player={player} size="sm" />
              <span className="flex-1 truncate font-sans text-[14px] text-ink">
                {formatPlayerName(player.fullName)}
              </span>
              {team && (
                <span className="text-[13px] leading-none" aria-label={team.name}>
                  {team.flagEmoji}
                </span>
              )}
              <span className="mono text-[13px] text-ink-3">{formatRate(rate)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CountriesCard({ countries }: { countries: HomeLeaderboard["topCountries"] }) {
  if (countries.length === 0)
    return (
      <Card padding="hero" className="gap-3">
        <PanelHeading>Country Leaderboard</PanelHeading>
      </Card>
    );
  const [hero, ...rest] = countries;
  return (
    <Card padding="hero" className="gap-3">
      <PanelHeading>Country Leaderboard</PanelHeading>
      <div className="flex flex-1 flex-col items-center gap-2 pb-1">
        <FlagTile flag={hero.team.flagEmoji} size="lg" />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="cond truncate text-[13px] font-bold text-ink">
            {hero.team.name}
          </span>
          <span className="mono text-[14px] font-bold text-ink">
            {formatRate(hero.rate)}
          </span>
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-line pt-2">
          {rest.map(({ team, rate }) => (
            <li key={team.code} className="flex items-center gap-2">
              <FlagTile flag={team.flagEmoji} size="sm" />
              <span className="flex-1 truncate font-sans text-[14px] text-ink">
                {team.name}
              </span>
              <span className="mono text-[13px] text-ink-3">{formatRate(rate)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FormationsCard({ formations }: { formations: HomeLeaderboard["topFormations"] }) {
  if (formations.length === 0)
    return (
      <Card padding="hero" className="gap-3">
        <PanelHeading>Popular Formations</PanelHeading>
      </Card>
    );
  const [hero, ...rest] = formations;
  return (
    <Card padding="hero" className="gap-3">
      <PanelHeading>Popular Formations</PanelHeading>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <FormationRow formation={hero} index={0} rowTag="div" />
      </div>
      {rest.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-line pt-2">
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
        isHero ? "gap-5" : "gap-3",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center leading-none",
          isHero ? "h-12 w-12 text-4xl" : "h-6 w-6 text-base",
        )}
        aria-hidden
      >
        {rankGlyph(index)}
      </span>
      <span
        className={cn(
          "flex-1 truncate",
          isHero ? "display text-[28px] text-ink" : "font-sans text-[14px] text-ink",
        )}
      >
        {formation.name}
      </span>
      <span
        className={cn(
          "mono shrink-0",
          isHero ? "text-[16px] font-bold text-ink" : "text-[13px] text-ink-3",
        )}
      >
        {formatRate(formation.rate)}
      </span>
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
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 text-ink",
        "cond font-bold",
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
  return <span className="block h-2 w-2 rounded-sm bg-ink-mute" aria-hidden />;
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
