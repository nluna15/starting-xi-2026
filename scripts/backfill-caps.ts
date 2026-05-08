// Backfills international_caps and international_goals from DuckDB into every
// data/*-players.json file. Safe to re-run; players with no DuckDB match are
// left with null rather than being removed.
//
// Usage:
//   npx tsx scripts/backfill-caps.ts

import { DuckDBInstance } from "@duckdb/node-api";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

async function main() {
  const dbPath = resolve(process.cwd(), "transfermarkt-datasets.duckdb");
  const instance = await DuckDBInstance.create(dbPath, { access_mode: "READ_ONLY" });
  const conn = await instance.connect();

  const dataDir = resolve(process.cwd(), "data");
  const files = readdirSync(dataDir).filter(f => f.endsWith("-players.json"));

  const allPlayers: { file: string; idx: number; transfermarktId: number }[] = [];
  const fileData: Record<string, any[]> = {};

  for (const file of files) {
    const players = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));
    fileData[file] = players;
    players.forEach((p: any, idx: number) => {
      allPlayers.push({ file, idx, transfermarktId: p.transfermarktId });
    });
  }

  const ids = [...new Set(allPlayers.map(p => p.transfermarktId))].join(",");
  const rows = await (await conn.run(
    `SELECT player_id, international_caps, international_goals FROM players WHERE player_id IN (${ids})`
  )).getRowObjects();

  const capsMap = new Map<number, { caps: number | null; goals: number | null }>();
  for (const r of rows) {
    const id = Number(r.player_id);
    const caps = r.international_caps != null ? Number(r.international_caps) : null;
    const goals = r.international_goals != null ? Number(r.international_goals) : null;
    capsMap.set(id, { caps, goals });
  }

  let updated = 0;
  for (const { file, idx, transfermarktId } of allPlayers) {
    const entry = capsMap.get(transfermarktId);
    const player = fileData[file][idx];
    player.internationalCaps = entry?.caps ?? null;
    player.internationalGoals = entry?.goals ?? null;
    if (entry?.caps != null) updated++;
  }

  for (const file of files) {
    writeFileSync(join(dataDir, file), JSON.stringify(fileData[file], null, 2) + "\n");
  }

  const total = allPlayers.length;
  console.log(`Updated ${files.length} files, ${total} players total.`);
  console.log(`  ${updated} players have cap data, ${total - updated} remain null.`);
}

main().catch(err => { console.error(err); process.exit(1); });
