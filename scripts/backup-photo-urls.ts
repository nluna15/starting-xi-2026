import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

/**
 * Snapshots `players.id → photo_url` before the Blob migration rewrites them,
 * so the change can be reverted with `scripts/restore-photo-urls.ts`.
 *
 *   npx tsx scripts/backup-photo-urls.ts
 */
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT id, photo_url FROM players ORDER BY id`;
  writeFileSync("data/photo-url-backup.json", JSON.stringify(rows, null, 2) + "\n");
  console.log(`backed up ${rows.length} rows to data/photo-url-backup.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
