import type { NextRequest } from "next/server";
import { db, schema } from "@/lib/db/client";
import { getOrCreateFingerprint } from "@/lib/fingerprint";

// Allowlist of trackable UI events. Keep names stable — queries depend on them.
const EVENTS = new Set([
  "build_lineup",
  "lineup_data",
  "download_squad",
  "share_squad",
  "how_it_works",
  "my_lineups",
]);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { name, path } =
    (body as { name?: unknown; path?: unknown } | null) ?? {};

  if (typeof name !== "string" || !EVENTS.has(name)) {
    return new Response("Unknown event", { status: 400 });
  }

  // Attribute the click to a stable per-browser id (creates one on first touch).
  const { fingerprint } = await getOrCreateFingerprint();

  await db.insert(schema.events).values({
    name,
    fingerprint,
    path: typeof path === "string" ? path.slice(0, 512) : null,
  });

  return new Response(null, { status: 204 });
}
