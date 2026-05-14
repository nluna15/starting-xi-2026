"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CommunityPitch, type CommunityStarter } from "@/components/community-pitch";
import { SubmissionPositionList } from "@/components/community/submission-position-list";
import {
  BADGE_COLORS,
  categorize,
  deviationTags,
  type BadgeKind,
  type DeviationTag,
} from "@/components/community/recent-submission-tags";
import { FIFA_FLAG_OVERRIDES, FIFA_TO_ISO2 } from "@/lib/wc-2026-teams";
import type { Player } from "@/lib/db/schema";
import type { RecentSubmission } from "@/lib/db/queries";
import { formatTimeAgo, lastName, useMediaQuery } from "@/lib/utils";

const TEAM_NAME_ABBREVIATIONS: Record<string, string> = {
  "United States": "USA",
  "Bosnia & Herzegovina": "BiH",
};

type Props = {
  submission: RecentSubmission;
};

export function RecentSubmissionCard({ submission }: Props) {
  const narrow = useMediaQuery("(max-width: 410px)");
  const { badge } = categorize(submission);
  const tags = deviationTags(submission);

  const flagOverride = FIFA_FLAG_OVERRIDES[submission.team.code] ?? null;
  const flagIso2 = FIFA_TO_ISO2[submission.team.code] ?? null;
  const starters: CommunityStarter[] = submission.starters.map((p) =>
    toCommunityStarter(p, flagIso2, flagOverride),
  );
  const bench: CommunityStarter[] = submission.bench.map((p) =>
    toCommunityStarter(p, flagIso2, flagOverride),
  );

  return (
    <Card padding="default" className="mx-auto w-full max-w-[420px] gap-3">
      <CardHeader
        flagEmoji={submission.team.flagEmoji}
        teamName={submission.team.name}
        teamCode={submission.team.code}
        formationName={submission.formation.name}
        createdAt={submission.createdAt}
        badge={badge}
      />

      {narrow ? (
        <SubmissionPositionList
          formationName={submission.formation.name}
          slots={submission.formation.slots}
          starters={submission.starters}
        />
      ) : (
        <div className="recent-submission-pitch mx-auto w-full max-w-[325px]">
          <CommunityPitch
            formation={submission.formation}
            starters={starters}
            showPhotos
            lastNameOnly
          />
        </div>
      )}

      {bench.length > 0 && <SubsRow bench={submission.bench} />}

      {submission.note && (
        <p className="text-[13px] leading-snug text-ink-2 italic">
          &ldquo;{submission.note}&rdquo;
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="cond text-[12px] tracking-[0.14em] text-accent">
            Beg to differ, Gaffer
          </h3>
          <DeviationTagsRow tags={tags} />
        </div>
      )}

      <div className="mt-auto flex justify-end">
        <Link
          href={`/lineup/${submission.slug}`}
          className="cond text-[12px] tracking-[0.14em] text-ink-3 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
        >
          See details →
        </Link>
      </div>
    </Card>
  );
}

function CardHeader({
  flagEmoji,
  teamName,
  teamCode,
  formationName,
  createdAt,
  badge,
}: {
  flagEmoji: string;
  teamName: string;
  teamCode: string;
  formationName: string;
  createdAt: Date;
  badge: BadgeKind;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl leading-none" aria-hidden="true">
        {flagEmoji}
      </span>
      <Link
        href={`/community/${teamCode.toLowerCase()}`}
        className="cond text-[15px] tracking-[0.06em] text-ink transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
      >
        {TEAM_NAME_ABBREVIATIONS[teamName] ?? teamName}
      </Link>
      <span className="cond text-[15px] tracking-[0.06em] text-ink">· {formationName}</span>
      <span className="mono text-[10px] tracking-[0.14em] text-ink-faint">
        · {formatTimeAgo(createdAt)}
      </span>
      <span className="ml-auto">
        <BadgePill badge={badge} />
      </span>
    </div>
  );
}

export function BadgePill({ badge }: { badge: BadgeKind }) {
  return (
    <span
      className="mono inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-white"
      style={{ backgroundColor: BADGE_COLORS[badge] }}
    >
      {badge}
    </span>
  );
}

function SubsRow({ bench }: { bench: Player[] }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="mono text-[10px] font-bold tracking-[0.14em] text-ink-faint">SUBS</span>
      <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {bench.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 text-[9px] font-semibold text-ink-3">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                getInitials(p.fullName)
              )}
            </span>
            <span className="cond text-[11px] tracking-[0.04em]">
              {lastName(p.fullName).toUpperCase()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeviationTagsRow({ tags }: { tags: DeviationTag[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <li
          key={`${tag.kind}-${i}`}
          className="mono inline-flex items-center gap-1 rounded-pill border border-line bg-surface-2 px-2 py-0.5 text-[10px] tracking-[0.1em]"
        >
          <span className="text-ink-faint">{tag.from.toUpperCase()}</span>
          <span className="text-ink-faint">→</span>
          <span className="font-bold text-accent">{tag.to.toUpperCase()}</span>
        </li>
      ))}
    </ul>
  );
}

function toCommunityStarter(
  p: Player,
  countryCode: string | null,
  flagEmojiOverride: string | null,
): CommunityStarter {
  return {
    id: p.id,
    fullName: p.fullName,
    photoUrl: p.photoUrl,
    countryCode,
    flagEmojiOverride,
    age: p.age,
    marketValueEur: p.marketValueEur,
    club: p.club,
  };
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
