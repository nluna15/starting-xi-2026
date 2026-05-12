import { Card } from "@/components/ui/card";
import { BadgePill, RecentSubmissionCard } from "@/components/community/recent-submission-card";
import type { BadgeKind } from "@/components/community/recent-submission-tags";
import type { RecentSubmission } from "@/lib/db/queries";

type Props = {
  submissions: RecentSubmission[];
  title?: string;
};

const TAG_KEY: Array<{ badge: BadgeKind; def: string }> = [
  { badge: "FRESH", def: "Among the first submissions for this team." },
  { badge: "THROWBACK", def: "Eight or more starters are older than 29." },
  { badge: "HATCHLINGS", def: "Starting XI averages under 24.5 years old." },
  { badge: "CONSENSUS", def: "Plays the team's most-picked formation with no bold starters." },
  { badge: "TACTICAL", def: "Unconventional formation, but every starter is a fan favorite." },
  { badge: "CONTROVERSIAL", def: "Unconventional formation with at least one bold starter." },
  { badge: "HOT TAKE", def: "Unconventional formation with three or more bold starters." },
];

function TagKey() {
  return (
    <Card padding="default" className="gap-3">
      <dl className="grid grid-cols-1 grid-rows-7 gap-x-5 gap-y-2 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-4">
        {TAG_KEY.map((e) => (
          <div key={e.badge} className="flex items-baseline gap-2">
            <dt className="shrink-0">
              <BadgePill badge={e.badge} />
            </dt>
            <dd className="text-[12px] leading-snug text-ink-2">{e.def}</dd>
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
      <header className="flex items-end justify-between gap-4">
        <h2 className="display text-[28px] text-ink sm:text-[32px]">{title}</h2>
      </header>
      <TagKey />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {submissions.map((s) => (
          <RecentSubmissionCard key={s.slug} submission={s} />
        ))}
      </div>
    </section>
  );
}
