import type { NextRequest } from "next/server";

const UPSTREAM_ORIGIN = "https://img.a.transfermarkt.technology";

/**
 * Legacy fallback for portraits still hosted by Transfermarkt.
 *
 * Nearly every portrait now lives in our own Vercel Blob store and is served
 * straight from its CDN (see `scripts/migrate-photos-to-blob.ts`); only the
 * images Transfermarkt could never serve during the migration still reach this
 * route, plus any new player added before the next migration run.
 *
 * Transfermarkt's image host sits behind Akamai, which intermittently answers
 * individual objects with `503 Service Unavailable - DNS failure` instead of
 * the JPEG. Two distinct modes show up in practice:
 *
 *   1. Short transient blips — a plain retry clears them.
 *   2. A single *cache key* stays poisoned for hours, while the very same
 *      object served under a different query string returns 200 the whole
 *      time. Every photo URL in our data carries a constant `?lm=1`
 *      cache-buster that conveys nothing, so dropping it yields a different
 *      Akamai cache key for the identical image.
 *
 * Retrying, then re-requesting without the cache-buster, covers both.
 */
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  if (path.some((seg) => seg.includes("..") || seg.includes("/") || seg.includes("\\"))) {
    return new Response("Bad request", { status: 400 });
  }

  const base = `${UPSTREAM_ORIGIN}/${path.map(encodeURIComponent).join("/")}`;
  const search = request.nextUrl.search;
  // Attempt 0 uses the URL as requested; later attempts drop the cache-buster
  // to land on a different upstream cache key.
  const candidates = search ? [`${base}${search}`, base] : [base];

  let lastStatus = 502;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const url = candidates[Math.min(attempt, candidates.length - 1)];

    let upstream: Response | null = null;
    try {
      // `no-store` keeps a 503 from being persisted in Next's data cache and
      // replayed for a day. Caching is handled by the `cache-control` we set
      // on our own successful response instead.
      upstream = await fetch(url, {
        headers: { accept: "image/*" },
        cache: "no-store",
      });
    } catch {
      upstream = null;
    }

    if (upstream?.ok) {
      const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        headers: {
          "content-type": contentType,
          "cache-control": "public, max-age=86400, s-maxage=2592000, immutable",
        },
      });
    }

    lastStatus = upstream?.status ?? 502;
    // A genuine 404/403 will not fix itself — stop early.
    if (upstream && !RETRYABLE_STATUS.has(upstream.status)) break;
    if (attempt < MAX_ATTEMPTS - 1) await sleep(150 * 2 ** attempt);
  }

  // Never let a transient failure get pinned in a CDN or browser cache.
  return new Response("Upstream error", {
    status: lastStatus,
    headers: { "cache-control": "no-store" },
  });
}
