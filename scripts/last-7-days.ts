import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const [subs] = (await sql`
    SELECT
      COUNT(*)::int                        AS lineups,
      COUNT(DISTINCT fingerprint)::int     AS unique_users
    FROM submissions
    WHERE created_at > now() - interval '7 days'
  `) as { lineups: number; unique_users: number }[];

  const ev = (await sql`
    SELECT
      name,
      COUNT(*)::int                        AS clicks,
      COUNT(DISTINCT fingerprint)::int     AS unique_users
    FROM events
    WHERE created_at > now() - interval '7 days'
      AND name IN ('share_squad', 'download_squad')
    GROUP BY name
    ORDER BY name
  `) as { name: string; clicks: number; unique_users: number }[];

  console.log("=== Last 7 days ===\n");
  console.log("Lineups submitted:", subs.lineups);
  console.log("Unique users (by fingerprint):", subs.unique_users);
  console.log("\nClick events:");
  for (const e of ev) {
    console.log(`  ${e.name.padEnd(16)} ${String(e.clicks).padStart(4)} clicks   (${e.unique_users} unique users)`);
  }
}

main();
