import { Card } from "@/components/ui/card";
import { BadgePill, RecentSubmissionCard } from "@/components/community/recent-submission-card";
import {
  BADGE_DEFINITIONS,
  type BadgeKind,
} from "@/components/community/recent-submission-tags";
import type { RecentSubmission } from "@/lib/db/queries";

type Props = {
  submissions: RecentSubmission[];
  title?: string | null;
};

const TAG_KEY_ORDER: BadgeKind[] = [
  "FRESH",
  "THROWBACK",
  "HATCHLINGS",
  "CONSENSUS",
  "TACTICAL",
  "CONTROVERSIAL",
  "HOT TAKE",
];

function TagKey() {
  return (
    <Card padding="default" className="gap-3">
      <dl className="grid grid-cols-1 grid-rows-7 gap-x-5 gap-y-2 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-4">
        {TAG_KEY_ORDER.map((badge) => (
          <div key={badge} className="flex items-baseline gap-2">
            <dt className="shrink-0">
              <BadgePill badge={badge} />
            </dt>
            <dd className="text-[12px] leading-snug text-ink-2">{BADGE_DEFINITIONS[badge]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-ink-faint italic">
        A &ldquo;bold&rdquo; starter appears in fewer than 1 in 5 lineups for this team.
      </p>
    </Card>
  );
}

export function RecentSubmissionsFeed({ submissions, title = "Recent submissions" }: Props) {
  if (submissions.length === 0) return null;
  return (
    <section className="space-y-4">
      {title && (
        <header className="flex items-end justify-between gap-4">
          <h2 className="display text-[28px] text-ink sm:text-[32px]">{title}</h2>
        </header>
      )}
      <TagKey />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {submissions.map((s) => (
          <RecentSubmissionCard key={s.slug} submission={s} />
        ))}
      </div>
    </section>
  );
}
