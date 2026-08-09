/* Maps a raw literal request path (as stored on `events.path`) to a normalized
   route template, so the "top pages" ranking collapses every dynamic instance
   of a route into a single row (e.g. all `/arg/build`, `/bra/build`, … become
   `/:teamCode/build`) instead of fragmenting across concrete segment values.

   The raw path stays available on the event row for team-level drilldowns; this
   helper is applied only at query time for ranking. */

// Concrete top-level routes. A single-segment path that matches one of these is
// a real static page, not a `/:teamCode` landing page.
//
// `/feedback` is a removed route but stays listed: `events.path` still holds
// historical rows for it, and dropping it here would silently reclassify every
// one of them as a `/:teamCode` country landing page.
const STATIC_ROUTES = new Set([
  "/",
  "/about",
  "/countries",
  "/community",
  "/feedback",
  "/my-lineups",
]);

/** Strip query/hash, trim whitespace, ensure a leading slash, and drop any
 *  trailing slash (except the root). Returns a clean absolute path. */
function cleanPath(raw: string): string {
  let p = raw.split("?")[0].split("#")[0].trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

/** Normalize a raw path to its route template. Unknown shapes fall through as
 *  the cleaned literal path so they remain countable rather than dropped. */
export function normalizeRoutePath(rawPath: string): string {
  const path = cleanPath(rawPath);
  if (STATIC_ROUTES.has(path)) return path;

  const segs = path.split("/").filter(Boolean);

  if (segs.length === 1) {
    // Single unknown segment → a country landing page (`/[teamCode]`).
    return "/:teamCode";
  }

  if (segs.length === 2) {
    const [first, second] = segs;
    if (first === "community") return "/community/:country";
    if (first === "lineup") return "/lineup/:slug";
    if (second === "build") return "/:teamCode/build";
    if (second === "crowd") return "/:teamCode/crowd";
  }

  return path;
}
