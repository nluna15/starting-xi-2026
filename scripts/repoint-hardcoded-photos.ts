import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Rewrites the hard-coded Transfermarkt portrait URLs in the homepage hero to
 * their Vercel Blob equivalents, using the mapping emitted by
 * `scripts/migrate-photos-to-blob.ts`.
 *
 *   npx tsx scripts/repoint-hardcoded-photos.ts
 */

const TARGETS = ["components/home/hero-pitch.tsx"];
const MAPPING_PATH = resolve("data/photo-blob-mapping.json");

const mapping: Record<string, string> = JSON.parse(readFileSync(MAPPING_PATH, "utf8"));

let totalReplaced = 0;
const unmapped = new Set<string>();

for (const target of TARGETS) {
  const path = resolve(target);
  const before = readFileSync(path, "utf8");
  let after = before;

  for (const match of before.matchAll(
    /https:\/\/img\.a\.transfermarkt\.technology\/[^"'\s]+/g,
  )) {
    const from = match[0];
    const to = mapping[from];
    if (!to) {
      unmapped.add(from);
      continue;
    }
    after = after.split(from).join(to);
    totalReplaced++;
  }

  if (after !== before) {
    writeFileSync(path, after);
    console.log(`${target}: rewritten`);
  } else {
    console.log(`${target}: no change`);
  }
}

console.log(`\nreplaced ${totalReplaced} URL occurrences`);
if (unmapped.size > 0) {
  console.log(`\n${unmapped.size} URL(s) had no blob mapping (left as-is):`);
  for (const u of unmapped) console.log(`  ${u}`);
}
