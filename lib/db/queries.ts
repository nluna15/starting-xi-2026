import { sql, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import { formations, players, submissions, teams } from "./schema";
import type { Formation, Player, Team } from "./schema";

export type RosterStatus = "ready" | "empty" | "missing";

export type CrowdStats = {
  totalSubmissions: number;
  team: { code: string; name: string; flagEmoji: string } | null;
  topFormation: { name: string; count: number } | null;
  formationCounts: { name: string; count: number }[];
  averages: {
    age: number | null;
    marketValueEur: number | null;
    submissionCount: number;
  };
  mostLikelyXi: {
    formation: Formation | null;
    slots: Array<{
      slot: string;
      position: string;
      x: number;
      y: number;
      player: Player | null;
      pickRate: number;
    }>;
  };
  topBench: Array<{ player: Player; count: number; rate: number }>;
};

export async function getTeamByCode(code: string) {
  const rows = await db.select().from(teams).where(sql`${teams.code} = ${code}`).limit(1);
  return rows[0] ?? null;
}

export async function getPlayersForTeam(teamId: number) {
  return db.select().from(players).where(sql`${players.teamId} = ${teamId}`).orderBy(players.fullName);
}

export async function getSubmissionCountForTeam(teamId: number): Promise<number> {
  const row = await db.execute(
    sql`select count(*)::int as count from ${submissions} where ${submissions.teamId} = ${teamId}`,
  );
  return Number((row.rows[0] as { count: number } | undefined)?.count ?? 0);
}

export async function getTotalSubmissionCount(): Promise<number> {
  const row = await db.execute(sql`select count(*)::int as count from ${submissions}`);
  return Number((row.rows[0] as { count: number } | undefined)?.count ?? 0);
}

// Maps every team code present in the DB to "ready" (has at least one player) or
// "empty" (team row exists but no players loaded yet). Codes absent from the DB
// are not in the map; callers fall back to "missing" for those.
export async function getRosterStatusByCode(): Promise<Map<string, RosterStatus>> {
  const rows = await db
    .select({ code: teams.code, count: sql<number>`count(${players.id})::int` })
    .from(teams)
    .leftJoin(players, eq(players.teamId, teams.id))
    .groupBy(teams.id, teams.code);

  const map = new Map<string, RosterStatus>();
  for (const r of rows) {
    map.set(r.code, Number(r.count) > 0 ? "ready" : "empty");
  }
  return map;
}

export async function getFormations() {
  return db.select().from(formations).orderBy(formations.name);
}

export async function getSubmissionBySlug(slug: string) {
  const rows = await db
    .select()
    .from(submissions)
    .where(sql`${submissions.publicSlug} = ${slug}`)
    .limit(1);
  return rows[0] ?? null;
}

export type TeamPickRates = {
  totalSubmissions: number;
  picksByPlayerId: Map<number, number>;
};

// For each player, count how many submissions for this team featured them
// anywhere in starters OR bench (all 14 slots). Used by the confirmation
// page to label each pick conventional / debated / bold.
export async function getPickRatesForTeam(teamId: number): Promise<TeamPickRates> {
  const totalRow = await db.execute(
    sql`select count(*)::int as count from ${submissions} where ${submissions.teamId} = ${teamId}`,
  );
  const totalSubmissions = Number((totalRow.rows[0] as { count: number } | undefined)?.count ?? 0);

  if (totalSubmissions === 0) {
    return { totalSubmissions, picksByPlayerId: new Map() };
  }

  const rows = await db.execute(sql`
    with featured as (
      select distinct s.id as submission_id, pid::int as player_id
      from ${submissions} s,
        lateral (
          select jsonb_array_elements_text(s.starters) as pid
          union all
          select jsonb_array_elements_text(s.bench) as pid
        ) all_picks
      where s.team_id = ${teamId}
    )
    select player_id, count(*)::int as picks
    from featured
    group by player_id
  `);

  const picksByPlayerId = new Map<number, number>();
  for (const r of rows.rows as Array<{ player_id: number; picks: number }>) {
    picksByPlayerId.set(Number(r.player_id), Number(r.picks));
  }
  return { totalSubmissions, picksByPlayerId };
}

export async function getCrowdStats(teamCode: string): Promise<CrowdStats> {
  const team = await getTeamByCode(teamCode);
  if (!team) {
    return emptyStats(null);
  }

  const totalRow = await db.execute(
    sql`select count(*)::int as count from ${submissions} where ${submissions.teamId} = ${team.id}`,
  );
  const total = Number((totalRow.rows[0] as { count: number } | undefined)?.count ?? 0);

  if (total === 0) {
    return emptyStats(team);
  }

  // Formation popularity
  const formationCountsRows = await db.execute(sql`
    select f.name as name, count(*)::int as count
    from ${submissions} s
    join ${formations} f on f.id = s.formation_id
    where s.team_id = ${team.id}
    group by f.name
    order by count desc
  `);
  const formationCounts = (formationCountsRows.rows as Array<{ name: string; count: number }>).map(
    (r) => ({ name: r.name, count: Number(r.count) }),
  );
  const topFormation = formationCounts[0] ?? null;

  // Average age and market value across all starters
  const avgRow = await db.execute(sql`
    with starter_picks as (
      select pid::int as pid
      from ${submissions} s,
        jsonb_array_elements_text(s.starters) pid
      where s.team_id = ${team.id}
    )
    select avg(p.age)::float as avg_age,
           avg(p.market_value_eur)::float as avg_value
    from starter_picks sp
    join ${players} p on p.id = sp.pid
  `);
  const avgRecord = avgRow.rows[0] as { avg_age: number | null; avg_value: number | null } | undefined;

  // Most-likely XI: pick the most-popular formation and, for each slot index in that formation,
  // pick the most-frequent player chosen for that slot.
  let mostLikelyFormation: Formation | null = null;
  let slotResults: CrowdStats["mostLikelyXi"]["slots"] = [];

  if (topFormation) {
    const fRows = await db
      .select()
      .from(formations)
      .where(sql`${formations.name} = ${topFormation.name}`)
      .limit(1);
    mostLikelyFormation = fRows[0] ?? null;

    if (mostLikelyFormation) {
      const slotRows = await db.execute(sql`
        with picks as (
          select (slot.ord - 1)::int as slot_index, slot.value::int as player_id
          from ${submissions} s,
            jsonb_array_elements_text(s.starters) with ordinality as slot(value, ord)
          where s.team_id = ${team.id}
            and s.formation_id = ${mostLikelyFormation.id}
        ),
        slot_totals as (
          select slot_index, count(*)::int as total_picks
          from picks
          group by slot_index
        ),
        ranked as (
          select p.slot_index, p.player_id, count(*)::int as picks,
                 row_number() over (partition by p.slot_index order by count(*) desc) as rn
          from picks p
          where exists (select 1 from ${players} pl where pl.id = p.player_id)
          group by p.slot_index, p.player_id
        )
        select r.slot_index, r.player_id, r.picks, st.total_picks
        from ranked r
        join slot_totals st on st.slot_index = r.slot_index
        where r.rn = 1
        order by r.slot_index
      `);

      const playerIds = (slotRows.rows as Array<{ player_id: number }>).map((r) => Number(r.player_id));
      const playerMap = new Map<number, Player>();
      if (playerIds.length > 0) {
        const ps = await db.select().from(players).where(inArray(players.id, playerIds));
        for (const p of ps) playerMap.set(p.id, p);
      }

      slotResults = mostLikelyFormation.slots.map((slot, idx) => {
        const row = (slotRows.rows as Array<{
          slot_index: number;
          player_id: number;
          picks: number;
          total_picks: number;
        }>).find((r) => Number(r.slot_index) === idx);
        const player = row ? playerMap.get(Number(row.player_id)) ?? null : null;
        const pickRate = row && row.total_picks ? Number(row.picks) / Number(row.total_picks) : 0;
        return { ...slot, player, pickRate };
      });
    }
  }

  // Top bench picks
  const benchRows = await db.execute(sql`
    with bench_picks as (
      select pid::int as player_id
      from ${submissions} s,
        jsonb_array_elements_text(s.bench) pid
      where s.team_id = ${team.id}
    )
    select player_id, count(*)::int as picks
    from bench_picks
    group by player_id
    order by picks desc
    limit 5
  `);
  const benchPlayerIds = (benchRows.rows as Array<{ player_id: number }>).map((r) => Number(r.player_id));
  const benchPlayerMap = new Map<number, Player>();
  if (benchPlayerIds.length > 0) {
    const ps = await db.select().from(players).where(inArray(players.id, benchPlayerIds));
    for (const p of ps) benchPlayerMap.set(p.id, p);
  }
  const topBench = (benchRows.rows as Array<{ player_id: number; picks: number }>).flatMap((r) => {
    const p = benchPlayerMap.get(Number(r.player_id));
    if (!p) return [];
    return [{ player: p, count: Number(r.picks), rate: Number(r.picks) / total }];
  });

  return {
    totalSubmissions: total,
    team: { code: team.code, name: team.name, flagEmoji: team.flagEmoji },
    topFormation: topFormation ? { name: topFormation.name, count: Number(topFormation.count) } : null,
    formationCounts,
    averages: {
      age: avgRecord?.avg_age ?? null,
      marketValueEur: avgRecord?.avg_value ?? null,
      submissionCount: total,
    },
    mostLikelyXi: {
      formation: mostLikelyFormation,
      slots: slotResults,
    },
    topBench,
  };
}

function emptyStats(team: CrowdStats["team"]): CrowdStats {
  return {
    totalSubmissions: 0,
    team,
    topFormation: null,
    formationCounts: [],
    averages: { age: null, marketValueEur: null, submissionCount: 0 },
    mostLikelyXi: { formation: null, slots: [] },
    topBench: [],
  };
}

export type HomeLeaderboard = {
  totalSubmissions: number;
  topPlayers: Array<{ player: Player; count: number; rate: number }>;
  topCountries: Array<{ team: Team; count: number; rate: number }>;
  topFormations: Array<{ name: string; count: number; rate: number }>;
};

export async function getHomeLeaderboard(): Promise<HomeLeaderboard> {
  const total = await getTotalSubmissionCount();
  if (total === 0) {
    return { totalSubmissions: 0, topPlayers: [], topCountries: [], topFormations: [] };
  }

  const playerRows = await db.execute(sql`
    with starter_picks as (
      select pid::int as player_id
      from ${submissions} s,
        jsonb_array_elements_text(s.starters) pid
    )
    select player_id, count(*)::int as picks
    from starter_picks
    group by player_id
    order by picks desc
    limit 5
  `);
  const playerIds = (playerRows.rows as Array<{ player_id: number }>).map((r) => Number(r.player_id));
  const playerMap = new Map<number, Player>();
  if (playerIds.length > 0) {
    const ps = await db.select().from(players).where(inArray(players.id, playerIds));
    for (const p of ps) playerMap.set(p.id, p);
  }
  const topPlayers = (playerRows.rows as Array<{ player_id: number; picks: number }>).flatMap((r) => {
    const p = playerMap.get(Number(r.player_id));
    if (!p) return [];
    const count = Number(r.picks);
    return [{ player: p, count, rate: count / total }];
  });

  const countryRows = await db.execute(sql`
    select team_id, count(*)::int as count
    from ${submissions}
    group by team_id
    order by count desc
    limit 5
  `);
  const teamIds = (countryRows.rows as Array<{ team_id: number }>).map((r) => Number(r.team_id));
  const teamMap = new Map<number, Team>();
  if (teamIds.length > 0) {
    const ts = await db.select().from(teams).where(inArray(teams.id, teamIds));
    for (const t of ts) teamMap.set(t.id, t);
  }
  const topCountries = (countryRows.rows as Array<{ team_id: number; count: number }>).flatMap((r) => {
    const t = teamMap.get(Number(r.team_id));
    if (!t) return [];
    const count = Number(r.count);
    return [{ team: t, count, rate: count / total }];
  });

  const formationRows = await db.execute(sql`
    select f.name as name, count(*)::int as count
    from ${submissions} s
    join ${formations} f on f.id = s.formation_id
    group by f.name
    order by count desc
    limit 5
  `);
  const topFormations = (formationRows.rows as Array<{ name: string; count: number }>).map((r) => {
    const count = Number(r.count);
    return { name: r.name, count, rate: count / total };
  });

  return { totalSubmissions: total, topPlayers, topCountries, topFormations };
}

export type GlobalCrowdStats = {
  totalSubmissions: number;
  topFormation: { name: string; count: number } | null;
  formationCounts: { name: string; count: number }[];
  mostLikelyXi: {
    formation: Formation | null;
    slots: Array<{
      slot: string;
      position: string;
      x: number;
      y: number;
      player: Player | null;
      pickRate: number;
    }>;
  };
  topPlayers: Array<{ player: Player; count: number; rate: number }>;
};

// Aggregates submissions across every team. The "most likely XI" mixes players
// from different national teams, so the lineup is a fantasy mash-up rather than
// a coherent national side. Same query shape as getCrowdStats, just without the
// team_id filter.
export async function getGlobalCrowdStats(): Promise<GlobalCrowdStats> {
  const total = await getTotalSubmissionCount();
  if (total === 0) {
    return {
      totalSubmissions: 0,
      topFormation: null,
      formationCounts: [],
      mostLikelyXi: { formation: null, slots: [] },
      topPlayers: [],
    };
  }

  const formationCountsRows = await db.execute(sql`
    select f.name as name, count(*)::int as count
    from ${submissions} s
    join ${formations} f on f.id = s.formation_id
    group by f.name
    order by count desc
  `);
  const formationCounts = (formationCountsRows.rows as Array<{ name: string; count: number }>).map(
    (r) => ({ name: r.name, count: Number(r.count) }),
  );
  const topFormation = formationCounts[0] ?? null;

  let mostLikelyFormation: Formation | null = null;
  let slotResults: GlobalCrowdStats["mostLikelyXi"]["slots"] = [];

  if (topFormation) {
    const fRows = await db
      .select()
      .from(formations)
      .where(sql`${formations.name} = ${topFormation.name}`)
      .limit(1);
    mostLikelyFormation = fRows[0] ?? null;

    if (mostLikelyFormation) {
      const slotRows = await db.execute(sql`
        with picks as (
          select (slot.ord - 1)::int as slot_index, slot.value::int as player_id
          from ${submissions} s,
            jsonb_array_elements_text(s.starters) with ordinality as slot(value, ord)
          where s.formation_id = ${mostLikelyFormation.id}
        ),
        slot_totals as (
          select slot_index, count(*)::int as total_picks
          from picks
          group by slot_index
        ),
        ranked as (
          select p.slot_index, p.player_id, count(*)::int as picks,
                 row_number() over (partition by p.slot_index order by count(*) desc) as rn
          from picks p
          where exists (select 1 from ${players} pl where pl.id = p.player_id)
          group by p.slot_index, p.player_id
        )
        select r.slot_index, r.player_id, r.picks, st.total_picks
        from ranked r
        join slot_totals st on st.slot_index = r.slot_index
        where r.rn = 1
        order by r.slot_index
      `);

      const playerIds = (slotRows.rows as Array<{ player_id: number }>).map((r) => Number(r.player_id));
      const playerMap = new Map<number, Player>();
      if (playerIds.length > 0) {
        const ps = await db.select().from(players).where(inArray(players.id, playerIds));
        for (const p of ps) playerMap.set(p.id, p);
      }

      slotResults = mostLikelyFormation.slots.map((slot, idx) => {
        const row = (slotRows.rows as Array<{
          slot_index: number;
          player_id: number;
          picks: number;
          total_picks: number;
        }>).find((r) => Number(r.slot_index) === idx);
        const player = row ? playerMap.get(Number(row.player_id)) ?? null : null;
        const pickRate = row && row.total_picks ? Number(row.picks) / Number(row.total_picks) : 0;
        return { ...slot, player, pickRate };
      });
    }
  }

  // Top 10 most-picked starters globally (any slot, any team).
  const topRows = await db.execute(sql`
    with starter_picks as (
      select pid::int as player_id
      from ${submissions} s,
        jsonb_array_elements_text(s.starters) pid
    )
    select player_id, count(*)::int as picks
    from starter_picks
    group by player_id
    order by picks desc
    limit 10
  `);
  const topIds = (topRows.rows as Array<{ player_id: number }>).map((r) => Number(r.player_id));
  const topMap = new Map<number, Player>();
  if (topIds.length > 0) {
    const ps = await db.select().from(players).where(inArray(players.id, topIds));
    for (const p of ps) topMap.set(p.id, p);
  }
  const topPlayers = (topRows.rows as Array<{ player_id: number; picks: number }>).flatMap((r) => {
    const p = topMap.get(Number(r.player_id));
    if (!p) return [];
    return [{ player: p, count: Number(r.picks), rate: Number(r.picks) / total }];
  });

  return {
    totalSubmissions: total,
    topFormation: topFormation ? { name: topFormation.name, count: Number(topFormation.count) } : null,
    formationCounts,
    mostLikelyXi: {
      formation: mostLikelyFormation,
      slots: slotResults,
    },
    topPlayers,
  };
}
