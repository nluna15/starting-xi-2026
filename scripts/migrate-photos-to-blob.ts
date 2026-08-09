import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { head, put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as dsql } from "drizzle-orm";
import { players } from "../lib/db/schema";

/**
 * Copies every Transfermarkt player portrait into our own Vercel Blob store and
 * repoints the database (and the `data/*.json` seed files) at the Blob URLs.
 *
 * Why: Transfermarkt's images sit behind an Akamai edge that intermittently
 * answers `503 Service Unavailable - DNS failure` for individual objects —
 * measured at roughly 9% of requests. Serving the portraits ourselves removes
 * that dependency from the request path entirely.
 *
 * The script is resumable: portraits already present in the Blob store are
 * skipped, so a partial run can simply be re-run.
 *
 *   npx tsx scripts/migrate-photos-to-blob.ts            # upload only, no writes
 *   npx tsx scripts/migrate-photos-to-blob.ts --apply    # upload + repoint DB/seed files
 */

const TM_PREFIX = "https://img.a.transfermarkt.technology/";
const CONCURRENCY = 12;
const MAX_ATTEMPTS = 4;
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAPPING_PATH = resolve("data/photo-blob-mapping.json");

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0,
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Downloads a portrait, working around the two upstream failure modes: short
 * transient 503s (a retry clears them) and a cache key that stays poisoned for
 * hours while the identical object under a different query string serves fine.
 * The `?lm=1` cache-buster carries no information, so dropping it yields a
 * different Akamai cache key for the same image.
 */
async function download(
  url: string,
): Promise<{ body: ArrayBuffer; contentType: string } | { error: string }> {
  const [base, query] = url.split("?");
  const candidates = query ? [url, base] : [base];
  let lastError = "unknown";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = candidates[Math.min(attempt, candidates.length - 1)];
    try {
      const res = await fetch(candidate, { headers: { accept: "image/*" } });
      if (res.ok) {
        const body = await res.arrayBuffer();
        if (body.byteLength === 0) {
          lastError = "empty body";
        } else {
          return {
            body,
            contentType: res.headers.get("content-type") ?? "image/jpeg",
          };
        }
      } else {
        lastError = `HTTP ${res.status}`;
        if (!RETRYABLE.has(res.status)) break;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < MAX_ATTEMPTS - 1) await sleep(250 * 2 ** attempt);
  }
  return { error: lastError };
}

/** `https://img.a…/portrait/header/1-2.jpg?lm=1` → `portrait/header/1-2.jpg` */
function blobPathname(url: string): string {
  return url.slice(TM_PREFIX.length).split("?")[0];
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull .env.local`.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
  const db = drizzle(neon(process.env.DATABASE_URL), { schema: { players } });

  // ---- collect the distinct set of upstream portraits ------------------------
  const rows = await db
    .select({ id: players.id, photoUrl: players.photoUrl })
    .from(players);

  let upstream = [
    ...new Set(
      rows
        .map((r) => r.photoUrl)
        .filter((u): u is string => !!u && u.startsWith(TM_PREFIX)),
    ),
  ];
  if (LIMIT > 0) upstream = upstream.slice(0, LIMIT);

  const alreadyBlob = rows.filter((r) => r.photoUrl?.includes(".blob.vercel-storage.com")).length;
  console.log(
    `players: ${rows.length} | distinct upstream portraits: ${upstream.length} | already on blob: ${alreadyBlob}`,
  );
  if (upstream.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  // ---- upload (resumable: skip anything already in the store) ---------------
  const mapping: Record<string, string> = {};
  const failures: { url: string; error: string }[] = [];
  let done = 0;
  let skipped = 0;
  let uploaded = 0;

  async function processOne(url: string) {
    const pathname = blobPathname(url);
    try {
      const existing = await head(pathname).catch(() => null);
      if (existing) {
        mapping[url] = existing.url;
        skipped++;
        return;
      }

      const result = await download(url);
      if ("error" in result) {
        failures.push({ url, error: result.error });
        return;
      }

      const blob = await put(pathname, Buffer.from(result.body), {
        access: "public",
        contentType: result.contentType,
        addRandomSuffix: false,
        // Portrait filenames embed an upload timestamp, so a given pathname is
        // immutable — safe to cache for a year.
        cacheControlMaxAge: 31_536_000,
      });
      mapping[url] = blob.url;
      uploaded++;
    } catch (e) {
      failures.push({ url, error: e instanceof Error ? e.message : String(e) });
    } finally {
      done++;
      if (done % 100 === 0 || done === upstream.length) {
        console.log(
          `  ${done}/${upstream.length}  (uploaded ${uploaded}, already present ${skipped}, failed ${failures.length})`,
        );
      }
    }
  }

  console.log(`\nUploading to Blob with concurrency ${CONCURRENCY}…`);
  const queue = [...upstream];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let next = queue.pop(); next; next = queue.pop()) await processOne(next);
    }),
  );

  writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2) + "\n");
  console.log(
    `\nuploaded ${uploaded}, already present ${skipped}, failed ${failures.length}` +
      `\nmapping written to ${MAPPING_PATH}`,
  );

  if (failures.length) {
    console.log("\nCould not fetch (left pointing at Transfermarkt):");
    for (const f of failures.slice(0, 25)) console.log(`  ${f.error}  ${f.url}`);
    if (failures.length > 25) console.log(`  …and ${failures.length - 25} more`);
  }

  if (!APPLY) {
    console.log("\nDry run — no database or seed-file writes. Re-run with --apply.");
    return;
  }

  // ---- repoint the database -------------------------------------------------
  // Portraits that could not be fetched keep their Transfermarkt URL so the
  // hardened /api/player-photo proxy still serves them and they can recover.
  console.log("\nUpdating players.photo_url…");
  const pending = rows
    .map((r) => ({ id: r.id, to: r.photoUrl ? mapping[r.photoUrl] : undefined }))
    .filter((r): r is { id: number; to: string } => !!r.to);

  // Batched `UPDATE … FROM (VALUES …)` — one round trip per chunk instead of
  // one per player, which matters over Neon's HTTP driver.
  const CHUNK = 400;
  let updated = 0;
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK);
    const values = dsql.join(
      chunk.map((r) => dsql`(${r.id}::int, ${r.to}::text)`),
      dsql`, `,
    );
    await db.execute(
      dsql`UPDATE players SET photo_url = v.url FROM (VALUES ${values}) AS v(id, url) WHERE players.id = v.id`,
    );
    updated += chunk.length;
    console.log(`  ${updated}/${pending.length} rows updated`);
  }

  // ---- repoint the seed files so a re-seed does not revert the migration ----
  console.log("\nRewriting data/*.json…");
  let filesChanged = 0;
  let entriesChanged = 0;
  for (const file of readdirSync("data").filter((f) => f.endsWith("-players.json"))) {
    const path = resolve("data", file);
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    const list: { photoUrl?: string | null }[] = Array.isArray(parsed)
      ? parsed
      : parsed.players ?? [];
    let touched = 0;
    for (const p of list) {
      const to = p.photoUrl ? mapping[p.photoUrl] : undefined;
      if (!to || to === p.photoUrl) continue;
      p.photoUrl = to;
      touched++;
    }
    if (touched > 0) {
      writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n");
      filesChanged++;
      entriesChanged += touched;
    }
  }
  console.log(`  ${entriesChanged} entries across ${filesChanged} files`);
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
