/* Client-side click tracking. Fire-and-forget: never blocks navigation and
   never throws into the UI. `keepalive` lets the request finish even when the
   click triggers an immediate page navigation (e.g. nav links). Server-side
   the event is attributed to the `wcr_fp` fingerprint cookie. */

export type TrackEventName =
  | "build_lineup"
  | "lineup_data"
  | "download_squad"
  | "share_squad"
  | "how_it_works"
  | "my_lineups"
  // Community-page interactions (see /internal/analytics funnel + click metrics).
  | "community_country"
  | "community_recent_card"
  | "community_insight_expand"
  | "community_pick_cta"
  // Generic route-change pageview, fired once per navigation from the layout.
  | "page_view";

/* Optional `path` overrides the recorded path (defaults to the current URL).
   Use it to capture a click's destination (e.g. the country a tile links to)
   or, for `page_view`, the route the user navigated to. */
export function trackEvent(name: TrackEventName, path?: string): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, path: path ?? window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never break the click it is attached to.
  }
}
