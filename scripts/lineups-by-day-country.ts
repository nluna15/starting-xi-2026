import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // New users per week = week a fingerprint was first seen (UTC, Mon-start)
  const newUsers = (await sql`
    WITH firsts AS (
      SELECT fingerprint, MIN(created_at) AS first_seen
      FROM submissions
      GROUP BY fingerprint
    )
    SELECT
      to_char(date_trunc('week', first_seen AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS week_start,
      COUNT(*)::int AS new_users
    FROM firsts
    GROUP BY week_start
    ORDER BY week_start
  `) as { week_start: string; new_users: number }[];

  // Distribution: how many fingerprints built N lineups
  const dist = (await sql`
    WITH per_user AS (
      SELECT fingerprint, COUNT(*)::int AS n
      FROM submissions
      GROUP BY fingerprint
    )
    SELECT n AS lineups, COUNT(*)::int AS users
    FROM per_user
    GROUP BY n
    ORDER BY n
  `) as { lineups: number; users: number }[];

  const [stats] = (await sql`
    WITH per_user AS (
      SELECT COUNT(*)::int AS n FROM submissions GROUP BY fingerprint
    )
    SELECT
      ROUND(AVG(n), 2)::float                                          AS mean,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY n)::float            AS median,
      MAX(n)::int                                                       AS max
    FROM per_user
  `) as { mean: number; median: number; max: number }[];

  console.log("New users per week (by first-seen fingerprint, UTC):");
  let cumulative = 0;
  for (const w of newUsers) {
    cumulative += w.new_users;
    console.log(`  ${w.week_start}   +${String(w.new_users).padStart(2)}   (cumulative ${cumulative})`);
  }

  console.log("\nDistribution — lineups built per fingerprint:");
  for (const d of dist) {
    const bar = "█".repeat(d.users);
    console.log(`  ${String(d.lineups).padStart(2)} lineup(s): ${String(d.users).padStart(2)} users  ${bar}`);
  }

  console.log(
    `\n  mean ${stats.mean} | median ${stats.median} | max ${stats.max} lineups per user`,
  );
}

main();
