import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

export function initialPlusLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return fullName;
  const [first, ...rest] = parts;
  return `${first[0]}. ${rest.join(" ")}`;
}

export function normalize(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Returns true once mounted on a client whose viewport matches `query`.
 * SSR-safe: returns `false` on the server and on first client render so
 * hydration markup matches; switches to the live value on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function formatEur(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `€${m.toFixed(m >= 10 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `€${Math.round(value / 1_000)}K`;
  }
  return `€${Math.round(value)}`;
}

export function formatAge(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

const TRANSFERMARKT_PHOTO_PREFIX = "https://img.a.transfermarkt.technology/";

/**
 * Rewrites upstream player photo URLs to a same-origin proxy so canvas-based
 * exporters (html-to-image) can read the bytes without tainting the canvas.
 * Non-matching URLs pass through unchanged.
 */
export function proxyPhotoUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith(TRANSFERMARKT_PHOTO_PREFIX)) {
    return `/api/player-photo/${url.slice(TRANSFERMARKT_PHOTO_PREFIX.length)}`;
  }
  return url;
}

export function formatTimeAgo(date: Date | string): string {
  const t = typeof date === "string" ? new Date(date) : date;
  const sec = Math.max(1, Math.round((Date.now() - t.getTime()) / 1000));
  if (sec < 60) return `${sec}S AGO`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}M AGO`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}H AGO`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}D AGO`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}W AGO`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}MO AGO`;
  return `${Math.round(d / 365)}Y AGO`;
}
