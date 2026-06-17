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
  | "my_lineups";

export function trackEvent(name: TrackEventName): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never break the click it is attached to.
  }
}
