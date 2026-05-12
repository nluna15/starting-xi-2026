import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/section-heading";

/* -----------------------------------------------------------------------------
   How it works — three numbered editorial cards.
   - Step indicator: mono 11px ink-faint ("STEP 01 / 03").
   - Title:          display 22px ink (a hair below the section heading so the
                     section title still reads as the primary level).
   - Body:           sans 14px ink-3, line-height 1.45.
   ----------------------------------------------------------------------------- */

const STEPS = [
  {
    title: "Pick your country",
    body: "Select from any of the qualified countries. FYI - Some countries rosters are coming soon",
  },
  {
    title: "Select a formation",
    body: "Choose the tactical shape that fits your vision, personnel strengths, or what you believe will earn a result on match day.",
  },
  {
    title: "Fine tune your squad",
    body: "Your starting 11 only tells half the story. Who are the substitutes that can break a game open?",
  },
  {
    title: "Almost Kick-Off",
    body: "See how your roster stacks up against other lineups. Is your squad inexperienced, veterans, or packed with as much talent as possible?",
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-3">
      <SectionHeading title="How it Works" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => {
          const stepLabel = `Step ${String(i + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}`;
          return (
            <Card key={step.title} padding="hero" className="gap-3">
              <span className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
                {stepLabel}
              </span>
              <h3 className="display text-[22px] leading-[0.95] text-ink [text-wrap:balance]">
                {step.title}
              </h3>
              <p className="font-sans text-[14px] leading-[1.45] text-ink-3">{step.body}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
