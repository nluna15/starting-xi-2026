import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const ev = (await sql`
    SELECT
      name,
      COUNT(*)::int                    AS clicks,
      COUNT(DISTINCT fingerprint)::int AS unique_users
    FROM events
    WHERE created_at > now() - interval '10 days'
      AND name IN ('share_squad', 'download_squad')
    GROUP BY name
    ORDER BY name
  `) as { name: string; clicks: number; unique_users: number }[];

  const [combined] = (await sql`
    SELECT COUNT(DISTINCT fingerprint)::int AS unique_users
    FROM events
    WHERE created_at > now() - interval '10 days'
      AND name IN ('share_squad', 'download_squad')
  `) as { unique_users: number }[];

  console.log("=== Last 10 days: download/share squad ===\n");
  for (const e of ev) {
    console.log(`  ${e.name.padEnd(16)} ${String(e.clicks).padStart(4)} clicks   (${e.unique_users} unique users)`);
  }
  console.log(`\n  Unique users who clicked EITHER action: ${combined?.unique_users ?? 0}`);
}

main();
