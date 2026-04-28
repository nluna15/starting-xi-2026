// Audit Transfermarkt coverage for every confirmed WC 2026 slot. For each team
// it counts available players per position bucket (independent of the 30-row
// quota the build script applies) and flags any deficit against that quota.
// Read-only — does not touch data/*.json.

import { DuckDBInstance } from "@duckdb/node-api";
import { resolve } from "node:path";
import { TM_COUNTRY_BY_CODE, WC_2026_SLOTS } from "../lib/wc-2026-teams";

const QUOTA = { GK: 3, DEF: 9, MID: 10, FWD: 8 } as const;
const RECENT_SEASON_MIN = "2023";

type Bucket = keyof typeof QUOTA;
const TM_TO_BUCKET: Record<string, Bucket> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfield: "MID",
  Attack: "FWD",
};

async function main() {
  const dbPath = resolve(process.cwd(), "transfermarkt-datasets.duckdb");
  const instance = await DuckDBInstance.create(dbPath, { access_mode: "READ_ONLY" });
  const conn = await instance.connect();

  // Sanity-check the country mapping against national_teams.country_name.
  const validCountries = new Set<string>(
    (await (await conn.run(`SELECT DISTINCT country_name FROM national_teams`)).getRowObjects()).map(
      (r) => r.country_name as string,
    ),
  );

  const confirmed = WC_2026_SLOTS.filter((s) => s.kind === "confirmed");
  type Row = {
    code: string;
    name: string;
    tmCountry: string | null;
    inTm: boolean;
    GK: number;
    DEF: number;
    MID: number;
    FWD: number;
    total: number;
    calledUp: number;
  };
  const results: Row[] = [];

  for (const slot of confirmed) {
    if (slot.kind !== "confirmed") continue;
    const tmCountry = TM_COUNTRY_BY_CODE[slot.code] ?? null;
    const row: Row = {
      code: slot.code,
      name: slot.name,
      tmCountry,
      inTm: tmCountry ? validCountries.has(tmCountry) : false,
      GK: 0,
      DEF: 0,
      MID: 0,
      FWD: 0,
      total: 0,
      calledUp: 0,
    };

    if (tmCountry && row.inTm) {
      const escaped = tmCountry.replace(/'/g, "''");
      const sql = `
        WITH nt AS (
          SELECT national_team_id FROM national_teams WHERE country_name = '${escaped}'
        ),
        called_up AS (
          SELECT p.* FROM players p JOIN nt ON p.current_national_team_id = nt.national_team_id
        ),
        citizens AS (
          SELECT p.* FROM players p
          WHERE p.country_of_citizenship = '${escaped}'
            AND p.last_season >= '${RECENT_SEASON_MIN}'
            AND p.market_value_in_eur IS NOT NULL
        ),
        combined AS (SELECT * FROM called_up UNION ALL SELECT * FROM citizens),
        deduped AS (SELECT DISTINCT ON (player_id) * FROM combined ORDER BY player_id)
        SELECT position, COUNT(*)::INT AS n
        FROM deduped
        WHERE position IS NOT NULL
          AND date_of_birth IS NOT NULL
          AND market_value_in_eur IS NOT NULL
        GROUP BY position;
      `;
      const rows = await (await conn.run(sql)).getRowObjects();
      for (const r of rows) {
        const bucket = TM_TO_BUCKET[r.position as string];
        if (bucket) row[bucket] = r.n as number;
      }
      row.total = row.GK + row.DEF + row.MID + row.FWD;

      const calledUpRow = (
        await (
          await conn.run(`
            SELECT COUNT(*)::INT AS n FROM players p
            JOIN national_teams nt ON p.current_national_team_id = nt.national_team_id
            WHERE nt.country_name = '${escaped}'
          `)
        ).getRowObjects()
      )[0];
      row.calledUp = (calledUpRow?.n as number) ?? 0;
    }

    results.push(row);
  }

  // Sort: gaps first (worst), then by code.
  function gapsOf(r: Row): number {
    return (
      Math.max(0, QUOTA.GK - r.GK) +
      Math.max(0, QUOTA.DEF - r.DEF) +
      Math.max(0, QUOTA.MID - r.MID) +
      Math.max(0, QUOTA.FWD - r.FWD)
    );
  }
  results.sort((a, b) => gapsOf(b) - gapsOf(a) || a.code.localeCompare(b.code));

  const fmt = (n: number, q: number) => {
    const s = String(n).padStart(2);
    return n < q ? `\x1b[31m${s}\x1b[0m` : s;
  };

  console.log(
    `\nAudit against transfermarkt-datasets.duckdb. Quotas: GK ${QUOTA.GK}, DEF ${QUOTA.DEF}, MID ${QUOTA.MID}, FWD ${QUOTA.FWD} (total 30).\n`,
  );
  console.log(
    "code  team                 TM-country           inDB  GK  DEF MID FWD  total  called-up  status",
  );
  console.log("-".repeat(110));

  let gappy: Row[] = [];
  for (const r of results) {
    const status = !r.inTm
      ? "MISSING from TM"
      : gapsOf(r) === 0
        ? "ok"
        : "GAP";
    if (status !== "ok") gappy.push(r);
    console.log(
      `${r.code.padEnd(5)} ${r.name.padEnd(20)} ${(r.tmCountry ?? "—").padEnd(20)} ${(r.inTm ? "yes" : "no").padEnd(5)} ${fmt(r.GK, QUOTA.GK)}  ${fmt(r.DEF, QUOTA.DEF)}  ${fmt(r.MID, QUOTA.MID)}  ${fmt(r.FWD, QUOTA.FWD)}   ${String(r.total).padStart(3)}      ${String(r.calledUp).padStart(3)}        ${status}`,
    );
  }

  console.log(`\n${results.length} confirmed teams audited; ${gappy.length} with gaps.\n`);
  if (gappy.length > 0) {
    console.log("Teams with gaps (need manual GK/DEF/MID/FWD additions before seeding):");
    for (const r of gappy) {
      const missing: string[] = [];
      if (!r.inTm) missing.push("entire team absent from TM");
      else {
        if (r.GK < QUOTA.GK) missing.push(`GK ${r.GK}/${QUOTA.GK}`);
        if (r.DEF < QUOTA.DEF) missing.push(`DEF ${r.DEF}/${QUOTA.DEF}`);
        if (r.MID < QUOTA.MID) missing.push(`MID ${r.MID}/${QUOTA.MID}`);
        if (r.FWD < QUOTA.FWD) missing.push(`FWD ${r.FWD}/${QUOTA.FWD}`);
      }
      console.log(`  ${r.code} (${r.name}): ${missing.join(", ")}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
