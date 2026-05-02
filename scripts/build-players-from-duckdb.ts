// Reads transfermarkt-datasets.duckdb and writes one data/<code>-players.json
// per confirmed WC 2026 slot. Idempotent: re-run any time you refresh the
// DuckDB snapshot. The existing `npm run db:seed` then loads these into Neon.
//
// Usage:
//   npx tsx scripts/build-players-from-duckdb.ts          # writes all teams
//   npx tsx scripts/build-players-from-duckdb.ts USA MEX  # subset
//   npx tsx scripts/build-players-from-duckdb.ts --keep-existing  # skip teams that already have a JSON file
//
// Players with hand-tuned files (e.g. data/usa-players.json) won't be
// overwritten when --keep-existing is passed.

import { DuckDBInstance } from "@duckdb/node-api";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { TM_COUNTRY_BY_CODE, WC_2026_SLOTS } from "../lib/wc-2026-teams";

// Transfermarkt position → our four-bucket schema.
const POSITION_BUCKET: Record<string, "GK" | "DEF" | "MID" | "FWD"> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfield: "MID",
  Attack: "FWD",
};

// Transfermarkt sub_position → the abbreviation our UI/seed format uses.
const SUB_POSITION_ABBR: Record<string, string> = {
  Goalkeeper: "GK",
  "Centre-Back": "CB",
  "Left-Back": "LB",
  "Right-Back": "RB",
  "Defensive Midfield": "CDM",
  "Central Midfield": "CM",
  "Attacking Midfield": "CAM",
  "Left Midfield": "LM",
  "Right Midfield": "RM",
  "Left Winger": "LW",
  "Right Winger": "RW",
  "Centre-Forward": "ST",
  "Second Striker": "SS",
};

// Per-position floor / ceiling. We fill each bucket up to its ceiling (60-player
// total) but only write a team if every bucket also clears its floor (30-player
// total) — anything in between is fine. A flat top-N by market value drops
// every GK off the list since outfielders dominate valuations, so position
// caps are required regardless of the chosen total.
const FLOOR: Record<"GK" | "DEF" | "MID" | "FWD", number> = {
  GK: 3,
  DEF: 9,
  MID: 10,
  FWD: 8,
};
const CEILING: Record<"GK" | "DEF" | "MID" | "FWD", number> = {
  GK: 10,
  DEF: 30,
  MID: 33,
  FWD: 27,
};
// Transfermarkt fills current_national_team_id for active call-ups but not
// always; falling back to citizenship + recent activity catches the rest.
const RECENT_SEASON_MIN = "2023";

// Transfermarkt's current_club_name is the legal entity name. Strip the
// boilerplate so the UI shows e.g. "Fulham" instead of "Fulham Football Club".
// Order matters: specific multi-word phrases before the generic suffix rules
// they contain.
const CLUB_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bEindhovense Voetbalvereniging Philips Sport Vereniging\b/gi, "PSV Eindhoven"],
  [/\bBorussia Verein für Leibesübungen 1900 Mönchengladbach\b/gi, "Borussia Mönchengladbach"],
  [/\bAssociation Football Club\b/g, "AFC"],
  [/\bAssociation sportive de Monaco\b/gi, "AS Monaco"],
  [/\bClub Atlético de Madrid\b/gi, "Atlético Madrid"],
  [/\bClub de Futbol\b/gi, "CF"],
  [/\bAssociazione Calcio\b/g, "AC"],
  [/\bSocietà Sportiva\b/g, "SS"],
  [/\bHamburger Sport[- ]?Verein\b/gi, "Hamburger SV"],
  [/\bThe Celtic\b/gi, "Celtic"],
  [/\bLeeds United\b.*$/gi, "Leeds United"],
  [/\bFußball-Club\b/g, "FC"],
  [/\bFootball Club\b/g, "FC"],
  [/\bFußball\b/g, ""],
  // Legal/entity suffixes — eat surrounding whitespace and punctuation too.
  [/\s*[,·]?\s*\b(S\.?A\.?D\.?|S\.?p\.?A\.?|GmbH(?:\s*&\s*Co\.?\s*KGaA)?|S\.?\s?A\.?\s?de\s?C\.?\s?V\.?|e\.?V\.?)\.?\s*$/gi, ""],
  [/\s{2,}/g, " "],
];

function cleanClubName(raw: string | null): string {
  if (!raw) return "Unknown";
  let out = raw;
  for (const [re, repl] of CLUB_REPLACEMENTS) out = out.replace(re, repl);
  return out.trim().replace(/[\s.,]+$/, "");
}

type ExportedPlayer = {
  transfermarktId: number;
  fullName: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  detailedPosition: string;
  jerseyNumber: number | null;
  club: string;
  age: number;
  marketValueEur: number;
  photoUrl: string | null;
};

function ageFromDob(dob: Date, today = new Date()): number {
  let years = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) years -= 1;
  return years;
}

async function exportTeam(
  conn: Awaited<ReturnType<Awaited<ReturnType<typeof DuckDBInstance.create>>["connect"]>>,
  code: string,
  tmCountry: string,
): Promise<ExportedPlayer[]> {
  // Strategy: pull every player whose Transfermarkt "current national team"
  // matches; if that yields too few (some rosters under-tagged), top up with
  // citizens still active recently. Dedupe by player_id, rank by source.
  const escaped = tmCountry.replace(/'/g, "''");
  const sql = `
    WITH nt AS (
      SELECT national_team_id FROM national_teams WHERE country_name = '${escaped}'
    ),
    called_up AS (
      SELECT p.*, 1 AS source_rank
      FROM players p
      JOIN nt ON p.current_national_team_id = nt.national_team_id
    ),
    citizens AS (
      SELECT p.*, 2 AS source_rank
      FROM players p
      WHERE p.country_of_citizenship = '${escaped}'
        AND p.last_season >= '${RECENT_SEASON_MIN}'
        AND p.market_value_in_eur IS NOT NULL
    ),
    combined AS (
      SELECT * FROM called_up
      UNION ALL
      SELECT * FROM citizens
    ),
    deduped AS (
      SELECT DISTINCT ON (player_id) *
      FROM combined
      ORDER BY player_id, source_rank ASC
    )
    SELECT
      player_id,
      name,
      position,
      sub_position,
      current_club_name,
      market_value_in_eur,
      date_of_birth,
      image_url,
      international_caps
    FROM deduped
    WHERE position IS NOT NULL
      AND date_of_birth IS NOT NULL
      AND market_value_in_eur IS NOT NULL
    ORDER BY market_value_in_eur DESC NULLS LAST, international_caps DESC NULLS LAST;
  `;
  const rows = await (await conn.run(sql)).getRowObjects();

  const today = new Date();
  const buckets: Record<"GK" | "DEF" | "MID" | "FWD", ExportedPlayer[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  for (const r of rows) {
    const tmPos = r.position as string;
    const bucket = POSITION_BUCKET[tmPos];
    if (!bucket) continue;
    if (buckets[bucket].length >= CEILING[bucket]) continue;

    const subPos = (r.sub_position as string | null) ?? "";
    const detailed = SUB_POSITION_ABBR[subPos] ?? bucket;

    const dobRaw = r.date_of_birth as { micros: bigint } | Date | null;
    let dob: Date;
    if (dobRaw && typeof dobRaw === "object" && "micros" in dobRaw) {
      dob = new Date(Number(dobRaw.micros / 1000n));
    } else if (dobRaw instanceof Date) {
      dob = dobRaw;
    } else {
      continue;
    }

    const tmIdRaw = r.player_id as number | bigint | null;
    if (tmIdRaw == null) continue;
    const transfermarktId = typeof tmIdRaw === "bigint" ? Number(tmIdRaw) : tmIdRaw;

    buckets[bucket].push({
      transfermarktId,
      fullName: r.name as string,
      position: bucket,
      detailedPosition: detailed,
      jerseyNumber: null,
      club: cleanClubName(r.current_club_name as string | null),
      age: ageFromDob(dob, today),
      marketValueEur: r.market_value_in_eur as number,
      photoUrl: (r.image_url as string | null) ?? null,
    });
  }

  return [...buckets.GK, ...buckets.DEF, ...buckets.MID, ...buckets.FWD];
}

async function main() {
  const args = process.argv.slice(2);
  const keepExisting = args.includes("--keep-existing");
  const codeFilter = args.filter((a) => !a.startsWith("--")).map((c) => c.toUpperCase());

  const dbPath = resolve(process.cwd(), "transfermarkt-datasets.duckdb");
  if (!existsSync(dbPath)) {
    throw new Error(`DuckDB file not found at ${dbPath}`);
  }
  const instance = await DuckDBInstance.create(dbPath, { access_mode: "READ_ONLY" });
  const conn = await instance.connect();

  const confirmed = WC_2026_SLOTS.filter((s) => s.kind === "confirmed");
  let written = 0;
  let skipped = 0;

  for (const slot of confirmed) {
    if (slot.kind !== "confirmed") continue;
    if (codeFilter.length && !codeFilter.includes(slot.code)) continue;

    const tmCountry = TM_COUNTRY_BY_CODE[slot.code];
    if (!tmCountry) {
      console.log(`  ${slot.code}: no Transfermarkt mapping — skipping`);
      skipped += 1;
      continue;
    }

    const outPath = resolve(process.cwd(), `data/${slot.code.toLowerCase()}-players.json`);
    if (keepExisting && existsSync(outPath)) {
      console.log(`  ${slot.code}: keeping existing ${outPath}`);
      skipped += 1;
      continue;
    }

    const players = await exportTeam(conn, slot.code, tmCountry);
    if (players.length === 0) {
      console.log(`  ${slot.code}: 0 players matched — leaving file alone`);
      skipped += 1;
      continue;
    }

    // Don't write skinny rosters: a below-floor team would render selectable
    // in the UI but be unfillable. Better to leave the slot showing
    // "Roster coming soon" until someone adds the missing players manually.
    const got = { GK: 0, DEF: 0, MID: 0, FWD: 0 } as Record<keyof typeof FLOOR, number>;
    for (const p of players) got[p.position] += 1;
    const shortfall = (Object.keys(FLOOR) as Array<keyof typeof FLOOR>)
      .filter((b) => got[b] < FLOOR[b])
      .map((b) => `${b} ${got[b]}/${FLOOR[b]}`);
    if (shortfall.length > 0) {
      console.log(`  ${slot.code}: skipping (gaps: ${shortfall.join(", ")})`);
      skipped += 1;
      continue;
    }

    writeFileSync(outPath, JSON.stringify(players, null, 2) + "\n");
    written += 1;
    console.log(`  ${slot.code} → ${players.length} players`);
  }

  console.log(`\nDone. Wrote ${written} files, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
