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
