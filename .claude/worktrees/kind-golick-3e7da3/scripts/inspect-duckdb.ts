import { DuckDBInstance } from "@duckdb/node-api";
import { resolve } from "node:path";

async function main() {
  const dbPath = resolve(process.cwd(), "transfermarkt-datasets.duckdb");
  const instance = await DuckDBInstance.create(dbPath, { access_mode: "READ_ONLY" });
  const conn = await instance.connect();

  for (const name of ["players", "national_teams", "clubs", "countries"]) {
    console.log(`\n=== ${name} ===`);
    const cols = await (await conn.run(`DESCRIBE "${name}"`)).getRowObjects();
    for (const c of cols) console.log("  ", c.column_name, c.column_type);

    const sample = await (await conn.run(`SELECT * FROM "${name}" LIMIT 2`)).getRowObjects();
    console.log("  sample rows:");
    for (const r of sample) console.log("   ", r);
  }

  console.log("\n=== national_teams: distinct country values ===");
  const ntCountries = await (
    await conn.run(
      `SELECT DISTINCT country_name FROM national_teams ORDER BY country_name LIMIT 250`,
    )
  ).getRowObjects();
  console.log(ntCountries.map((r) => r.country_name).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
