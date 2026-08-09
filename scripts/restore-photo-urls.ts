import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

/**
 * Reverts `players.photo_url` to the snapshot taken by
 * `scripts/backup-photo-urls.ts` — the rollback for the Blob migration.
 *
 *   npx tsx scripts/restore-photo-urls.ts
 *
 * Note this only restores the database. The `data/*.json` seed files are
 * tracked by git, so revert those with `git checkout -- data/`.
 */
const CHUNK = 400;

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows: { id: number; photo_url: string | null }[] = JSON.parse(
    readFileSync("data/photo-url-backup.json", "utf8"),
  );
  console.log(`restoring ${rows.length} rows…`);

  let restored = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ids = chunk.map((r) => r.id);
    const urls = chunk.map((r) => r.photo_url);
    await sql`
      UPDATE players SET photo_url = v.url
      FROM (SELECT unnest(${ids}::int[]) AS id, unnest(${urls}::text[]) AS url) AS v
      WHERE players.id = v.id`;
    restored += chunk.length;
    console.log(`  ${restored}/${rows.length}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
