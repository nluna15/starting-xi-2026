"use client";

import * as React from "react";
import { proxyPhotoUrl } from "@/lib/utils";

type Props = {
  photoUrl: string | null | undefined;
  alt: string;
  /** Rendered when there is no photo, or when the image fails to load. */
  fallback: React.ReactNode;
  className?: string;
};

/**
 * A player portrait that degrades to `fallback` (normally initials) instead of
 * a broken-image box.
 *
 * The proxy at `/api/player-photo` already retries transient upstream failures,
 * but Transfermarkt occasionally has an object that is genuinely unavailable on
 * every cache key. This is the last line of defence for that case — a leaf
 * client component so the surrounding server components stay server-rendered.
 */
export function PlayerPhoto({ photoUrl, alt, fallback, className }: Props) {
  const [failed, setFailed] = React.useState(false);
  const src = proxyPhotoUrl(photoUrl);

  if (!src || failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className ?? "h-full w-full object-cover"}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
