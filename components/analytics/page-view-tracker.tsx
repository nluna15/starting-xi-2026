"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/track";

/* Fires a single `page_view` event per route change (initial load + every
   client-side navigation), recording the raw path. Mounted once in the root
   layout. The internal analytics dashboard is excluded so it never pollutes
   its own pageview metrics. */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/internal/analytics")) return;
    trackEvent("page_view", pathname);
  }, [pathname]);

  return null;
}
