import { FeedbackForm } from "@/components/feedback-form";

export const metadata = {
  title: "Feedback",
  description:
    "Spotted a bug, missing player, or have a feature idea? Share your feedback on Starting XI 2026.",
  alternates: { canonical: "/feedback" },
};

export default function FeedbackPage() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6 py-2">
      <header className="space-y-1">
        <h1 className="display text-[44px] text-ink [text-wrap:balance] sm:text-[52px]">
          Feedback
        </h1>
        <p className="text-[13px] text-ink-3">
          Spotted a bug, missing player, or have a feature idea? Drop a note.
        </p>
      </header>
      <FeedbackForm />
    </div>
  );
}
