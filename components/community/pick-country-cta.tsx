"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/track";

type Props = {
  /** Button size — mirrors the design-system Button sizes. */
  size?: "sm" | "md" | "lg";
  /** Class applied to the wrapping link (e.g. layout hints like `sm:shrink-0`). */
  className?: string;
  children?: React.ReactNode;
};

/* The "Pick a country" CTA used across the community page. A thin client wrapper
   so the click can fire a `community_pick_cta` event (the entry point into the
   pick-team → submit funnel) before navigating to `/countries`. */
export function PickCountryCta({ size = "md", className, children = "Pick a country" }: Props) {
  return (
    <Link href="/countries" className={className}>
      <Button size={size} onClick={() => trackEvent("community_pick_cta")}>
        {children}
      </Button>
    </Link>
  );
}
