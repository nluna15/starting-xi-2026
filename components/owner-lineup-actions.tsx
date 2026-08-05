"use client";

import * as React from "react";
import Link from "next/link";
import { ShareActions } from "@/components/share/share-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/track";
import type { BadgeKind } from "@/components/community/recent-submission-tags";
import type { Player } from "@/lib/db/schema";
import type { FormationDef } from "@/lib/formations";

type Props = {
  slug: string;
  teamCode: string;
  team: { name: string; flagEmoji: string };
  formation: FormationDef;
  starters: Player[];
  bench: Player[];
  category: { badge: BadgeKind } | null;
};

export function OwnerLineupActions({
  slug,
  teamCode,
  team,
  formation,
  starters,
  bench,
  category,
}: Props) {
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function handleShare() {
    if (typeof window === "undefined") return;
    trackEvent("share_squad");
    try {
      const shareUrl = `${window.location.origin}/lineup/${slug}`;
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 max-[410px]:flex-row max-[410px]:gap-1.5">
      <Button
        variant="primary"
        size="lg"
        onClick={handleShare}
        className={cn(
          "w-full rounded-md! max-[410px]:flex-1 max-[410px]:basis-0 max-[410px]:min-w-0 max-[410px]:px-2",
          copied &&
            "bg-success hover:bg-success hover:translate-y-0 hover:shadow-2 active:bg-success",
        )}
        aria-live="polite"
      >
        {copied ? (
          <>
            <span className="max-[410px]:hidden">Team link copied</span>
            <span className="hidden max-[410px]:inline">Copied</span>
          </>
        ) : (
          <>
            Share<span className="max-[410px]:hidden"> Team</span>
          </>
        )}
      </Button>
      <ShareActions
        team={team}
        formation={formation}
        starters={starters}
        bench={bench}
        category={category}
      />
      <Link
        href={`/community/${teamCode.toLowerCase()}`}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "w-full rounded-md! max-[410px]:flex-1 max-[410px]:basis-0 max-[410px]:min-w-0 max-[410px]:px-2",
        )}
      >
        View<span className="max-[410px]:hidden"> {teamCode} Page</span>
        <span className="hidden max-[410px]:inline"> {team.flagEmoji}</span>
      </Link>
    </div>
  );
}
