import { RecentSubmissionCard } from "@/components/community/recent-submission-card";
import type { RecentSubmission } from "@/lib/db/queries";

type Props = {
  submissions: RecentSubmission[];
};

export function RecentSubmissionsFeed({ submissions }: Props) {
  if (submissions.length === 0) return null;
  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-4">
        <h2 className="display text-[28px] text-ink sm:text-[32px]">Recent submissions</h2>
        <span className="mono text-[11px] tracking-[0.14em] text-ink-faint">
          LAST {submissions.length}
        </span>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {submissions.map((s) => (
          <RecentSubmissionCard key={s.slug} submission={s} />
        ))}
      </div>
    </section>
  );
}
